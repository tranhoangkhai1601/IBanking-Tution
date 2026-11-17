import hashlib
import uuid
from decimal import Decimal

import httpx2
import redis.asyncio as redis
from fastapi import Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config import config
from databases.database import get_redis, get_session
from databases.models import OutBoxStatus, Outbox_Events, StatusType, Transactions
from databases.schema.payment_response import TuitionPaymentDetails


_IDEMPOTENCY_LOCK_TTL_SECONDS = 60
_RELEASE_LOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
end
return 0
"""


def _validate_payment(amount: Decimal, idempotency_key: str) -> None:
    if (
        not amount.is_finite()
        or amount <= 0
        or amount >= Decimal("1000000000000000")
    ):
        raise ValueError("amount must be positive and fit Numeric(19, 4)")
    if amount.as_tuple().exponent < -4:
        raise ValueError("amount must have at most 4 decimal places")
    if not idempotency_key or len(idempotency_key) > 255:
        raise ValueError("idempotency_key must contain 1 to 255 characters")


def _advisory_lock_id(idempotency_key: str) -> int:
    lock_bytes = hashlib.sha256(idempotency_key.encode("utf-8")).digest()[:8]
    return int.from_bytes(lock_bytes, byteorder="big", signed=True)


async def _lock_idempotency_key(
    session: AsyncSession,
    idempotency_key: str,
) -> None:
    await session.execute(
        text("SELECT pg_advisory_xact_lock(:lock_id)"),
        {"lock_id": _advisory_lock_id(idempotency_key)},
    )


async def _get_existing_payment(
    session: AsyncSession,
    *,
    customer_id: uuid.UUID,
    idempotency_key: str,
    account_id: uuid.UUID,
    tuition_id: uuid.UUID | None,
    amount: Decimal,
    description: str | None,
) -> Transactions | None:
    transaction = await session.scalar(
        select(Transactions).where(Transactions.idempotency_key == idempotency_key)
    )
    if transaction is None:
        return None

    if (
        transaction.account_id != account_id
        or (transaction.extra_data or {}).get("customer_id") != str(customer_id)
        or transaction.tuition_id != tuition_id
        or transaction.amount != amount
        or transaction.description != description
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency key was already used with a different payment request",
        )
    return transaction


class PaymentService:
    def __init__(self, session: AsyncSession, redis_client: redis.Redis):
        self.session = session
        self.redis = redis_client

    async def get_tuition_payment_details(
        self,
        tuition_id: uuid.UUID,
        student_id: str,
    ) -> TuitionPaymentDetails:
        url = (
            f"{config.TUITION_SERVICE_URL.rstrip('/')}/tuition/"
            f"{tuition_id}/payment-details"
        )
        try:
            async with httpx2.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params={"student_id": student_id})
                response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("detail", "Tuition request failed")
            except ValueError:
                detail = "Tuition request failed"
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=detail,
            ) from exc
        except httpx2.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Tuition service is unavailable",
            ) from exc

        try:
            return TuitionPaymentDetails.model_validate(response.json())
        except (ValueError, ValidationError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Tuition service returned an invalid response",
            ) from exc

    async def find_idempotent_tuition_payment(
        self,
        *,
        customer_id: uuid.UUID,
        account_id: uuid.UUID,
        tuition_id: uuid.UUID,
        description: str,
        idempotency_key: str,
    ) -> Transactions | None:
        async with self.session.begin():
            await _lock_idempotency_key(self.session, idempotency_key)
            transaction = await self.session.scalar(
                select(Transactions).where(
                    Transactions.idempotency_key == idempotency_key
                )
            )
            if transaction is None:
                return None
            if (
                transaction.account_id != account_id
                or (transaction.extra_data or {}).get("customer_id") != str(customer_id)
                or transaction.tuition_id != tuition_id
                or transaction.description != description
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency key was already used with a different payment request",
                )
            return transaction

    async def get_payment_status(
        self,
        transaction_id: uuid.UUID,
        *,
        customer_id: uuid.UUID,
    ) -> Transactions:
        transaction = await self.session.scalar(
            select(Transactions).where(
                Transactions.transaction_id == transaction_id
            )
        )
        if (
            transaction is None
            or (transaction.extra_data or {}).get("customer_id") != str(customer_id)
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment transaction was not found",
            )
        return transaction

    async def process_payment(
        self,
        *,
        customer_id: uuid.UUID,
        account_id: uuid.UUID,
        amount: Decimal,
        idempotency_key: str,
        merchant_account_id: uuid.UUID,
        student_name: str,
        tuition_id: uuid.UUID | None = None,
        description: str | None = None,
    ) -> Transactions:
        """Create a payment and its outbox event without adding database tables."""
        _validate_payment(amount, idempotency_key)

        key_digest = hashlib.sha256(idempotency_key.encode("utf-8")).hexdigest()
        redis_lock_key = f"payment:idempotency:{key_digest}"
        lock_token = str(uuid.uuid4())
        acquired = await self.redis.set(
            redis_lock_key,
            lock_token,
            ex=_IDEMPOTENCY_LOCK_TTL_SECONDS,
            nx=True,
        )

        if not acquired:
            async with self.session.begin():
                await _lock_idempotency_key(self.session, idempotency_key)
                existing = await _get_existing_payment(
                    self.session,
                    customer_id=customer_id,
                    idempotency_key=idempotency_key,
                    account_id=account_id,
                    tuition_id=tuition_id,
                    amount=amount,
                    description=description,
                )
            if existing is not None:
                return existing
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A payment with this idempotency key is still being processed",
                headers={"Retry-After": "1"},
            )

        try:
            try:
                async with self.session.begin():
                    # PostgreSQL keeps this lock until commit/rollback, so Redis
                    # lock expiry cannot let concurrent requests both insert.
                    await _lock_idempotency_key(self.session, idempotency_key)
                    existing = await _get_existing_payment(
                        self.session,
                        customer_id=customer_id,
                        idempotency_key=idempotency_key,
                        account_id=account_id,
                        tuition_id=tuition_id,
                        amount=amount,
                        description=description,
                    )
                    if existing is not None:
                        return existing

                    if tuition_id is not None:
                        await _lock_idempotency_key(
                            self.session,
                            f"tuition-payment:{tuition_id}",
                        )
                        pending_or_successful_payment = await self.session.scalar(
                            select(Transactions).where(
                                Transactions.tuition_id == tuition_id,
                                Transactions.status.in_(
                                    [StatusType.PENDING, StatusType.SUCCESS]
                                ),
                            )
                        )
                        if pending_or_successful_payment is not None:
                            raise HTTPException(
                                status_code=status.HTTP_409_CONFLICT,
                                detail="A payment already exists for this tuition",
                            )

                    transaction = Transactions(
                        account_id=account_id,
                        tuition_id=tuition_id,
                        amount=amount,
                        description=description,
                        status=StatusType.PENDING,
                        idempotency_key=idempotency_key,
                        extra_data={
                            "customer_id": str(customer_id),
                            "merchant_account_id": str(merchant_account_id),
                            "student_name": student_name,
                        },
                    )
                    self.session.add(transaction)
                    await self.session.flush()

                    self.session.add(
                        Outbox_Events(
                            aggregate_type="payment",
                            aggregate_id=str(transaction.transaction_id),
                            event_type="payment.created",
                            payload={
                                "transaction_id": str(transaction.transaction_id),
                                "customer_id": str(customer_id),
                                "account_id": str(account_id),
                                "tuition_id": str(tuition_id) if tuition_id else None,
                                "amount": str(amount),
                                "description": description,
                                "status": StatusType.PENDING.name,
                                "merchant_account_id": str(merchant_account_id),
                                "student_name": student_name,
                            },
                        )
                    )
                return transaction
            except IntegrityError:
                # The database uniqueness constraint is the final guard.
                async with self.session.begin():
                    existing = await _get_existing_payment(
                        self.session,
                        customer_id=customer_id,
                        idempotency_key=idempotency_key,
                        account_id=account_id,
                        tuition_id=tuition_id,
                        amount=amount,
                        description=description,
                    )
                if existing is None:
                    raise
                return existing
        finally:
            await self.redis.eval(
                _RELEASE_LOCK_SCRIPT,
                1,
                redis_lock_key,
                lock_token,
            )

    async def apply_account_debit_result(
        self,
        transaction_id: uuid.UUID,
        *,
        succeeded: bool,
        failure_reason: str | None = None,
    ) -> Transactions:
        """Apply the account service's debit result and publish payment success."""
        async with self.session.begin():
            transaction = await self.session.scalar(
                select(Transactions)
                .where(Transactions.transaction_id == transaction_id)
                .with_for_update()
            )
            if transaction is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment transaction was not found",
                )
            target_status = (
                StatusType.SUCCESS if succeeded else StatusType.FAILED
            )
            if transaction.status == target_status:
                return transaction
            if transaction.status in {StatusType.SUCCESS, StatusType.FAILED}:
                return transaction
            if transaction.status != StatusType.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Only pending payments can receive a debit result",
                )

            transaction.status = target_status
            await self.session.flush()
            self.session.add(
                Outbox_Events(
                    aggregate_type="payment",
                    aggregate_id=str(transaction.transaction_id),
                    event_type=(
                        "payment.succeeded" if succeeded else "payment.failed"
                    ),
                    payload={
                        "transaction_id": str(transaction.transaction_id),
                        "tuition_id": (
                            str(transaction.tuition_id)
                            if transaction.tuition_id
                            else None
                        ),
                        "amount": str(transaction.amount),
                        "status": target_status.name,
                        "failure_reason": failure_reason,
                    },
                    status=OutBoxStatus.NOTSEND,
                )
            )
        return transaction


def get_payment_service(
    session: AsyncSession = Depends(get_session),
    redis_client: redis.Redis = Depends(get_redis),
) -> PaymentService:
    return PaymentService(session, redis_client)
