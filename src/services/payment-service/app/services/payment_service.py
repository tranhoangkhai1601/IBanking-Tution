import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
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


logger = logging.getLogger(__name__)
_IDEMPOTENCY_LOCK_TTL_SECONDS = 60
_OTP_TTL_SECONDS = 300
_OTP_VERIFY_TTL_SECONDS = 24 * 60 * 60
_OTP_MAX_ATTEMPTS = 5
_RELEASE_LOCK_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
end
return 0
"""
_CLAIM_OTP_SCRIPT = """
if redis.call("EXISTS", KEYS[1]) == 1 or redis.call("EXISTS", KEYS[2]) == 1 then
    return 0
end
redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[3])
redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[3])
return 1
"""
_RELEASE_OTP_SCRIPT = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    redis.call("DEL", KEYS[1])
end
if redis.call("GET", KEYS[2]) == ARGV[2] then
    redis.call("DEL", KEYS[2])
end
return 1
"""
_CONSUME_OTP_SCRIPT = """
if redis.call("GET", KEYS[3]) == ARGV[2] then
    return 2
end
local otp = redis.call("GET", KEYS[1])
if not otp then
    return -1
end
if otp ~= ARGV[1] or redis.call("GET", KEYS[2]) ~= ARGV[2] then
    local attempts = redis.call("INCR", KEYS[4])
    if attempts == 1 then
        redis.call("EXPIRE", KEYS[4], ARGV[3])
    end
    if attempts >= tonumber(ARGV[4]) then
        redis.call("DEL", KEYS[1], KEYS[4])
        if redis.call("GET", KEYS[2]) == ARGV[2] then
            redis.call("DEL", KEYS[2])
        end
        return -2
    end
    return 0
end
redis.call("DEL", KEYS[1], KEYS[2], KEYS[4])
redis.call("SET", KEYS[3], ARGV[2], "EX", ARGV[5])
return 1
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
        customer_email: str,
        student_id: str,
        amount: Decimal,
        idempotency_key: str,
        merchant_account_id: uuid.UUID,
        student_name: str,
        tuition_id: uuid.UUID | None = None,
        description: str | None = None,
    ) -> Transactions:
        """Create an OTP-pending payment reservation without adding database tables."""
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
                            select(Transactions)
                            .where(
                                Transactions.tuition_id == tuition_id,
                                Transactions.status.in_(
                                    [StatusType.PENDING, StatusType.SUCCESS]
                                ),
                                (
                                    (Transactions.status == StatusType.SUCCESS)
                                    | (
                                        Transactions.extra_data["payment_stage"].astext
                                        == "PROCESSING"
                                    )
                                ),
                            )
                            .order_by(Transactions.create_at.desc())
                            .limit(1)
                            .with_for_update()
                        )
                        if pending_or_successful_payment is not None:
                            raise HTTPException(
                                status_code=status.HTTP_409_CONFLICT,
                                detail="A payment is already being processed for this tuition",
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
                            "student_id": student_id,
                            "customer_email": customer_email,
                            "payment_stage": "OTP_PENDING",
                        },
                    )
                    self.session.add(transaction)
                    await self.session.flush()

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

    async def send_payment_otp(self, transaction_id: uuid.UUID) -> None:
        issue_lock_key = f"otp:issue:{transaction_id}"
        issue_token = str(uuid.uuid4())
        acquired = await self.redis.set(
            issue_lock_key,
            issue_token,
            ex=30,
            nx=True,
        )
        if not acquired:
            return

        try:
            async with self.session.begin():
                transaction = await self.session.scalar(
                    select(Transactions).where(
                        Transactions.transaction_id == transaction_id
                    )
                )
                if transaction is None or transaction.status != StatusType.PENDING:
                    return
                data = dict(transaction.extra_data or {})
                if data.get("payment_stage") != "OTP_PENDING":
                    return
                recipient = data.get("customer_email")
                if not recipient:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Customer email is required to send a payment OTP",
                    )
                otp_key = f"otp:transaction:{transaction_id}"
                verified_key = f"otp:verified:{transaction_id}"
                if await self.redis.exists(verified_key):
                    return
                existing_otp = await self.redis.get(otp_key)
                otp_ttl = await self.redis.ttl(otp_key) if existing_otp else 0
                if existing_otp and otp_ttl > 0:
                    if await self.redis.exists(f"otp:sent:{transaction_id}"):
                        return
                else:
                    existing_otp = None
                created_at = transaction.create_at
                if created_at is not None and created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                if (
                    existing_otp is None
                    and created_at is not None
                    and datetime.now(timezone.utc) - created_at
                    >= timedelta(seconds=_OTP_TTL_SECONDS)
                ):
                    transaction.status = StatusType.FAILED
                    data["payment_stage"] = "OTP_EXPIRED"
                    transaction.extra_data = data
                    return

            if existing_otp is not None:
                otp_code = (
                    existing_otp.decode("utf-8")
                    if isinstance(existing_otp, bytes)
                    else existing_otp
                )
                active_otp_key = f"otp:active:{otp_code}"
                if await self.redis.get(active_otp_key) != str(transaction_id):
                    raise RuntimeError("The payment OTP reservation is inconsistent")
            else:
                otp_ttl = _OTP_TTL_SECONDS
                active_otp_key = ""
                otp_code = ""
                for _ in range(1000):
                    otp_code = f"{secrets.randbelow(1_000_000):06d}"
                    active_otp_key = f"otp:active:{otp_code}"
                    claimed = await self.redis.eval(
                        _CLAIM_OTP_SCRIPT,
                        2,
                        otp_key,
                        active_otp_key,
                        otp_code,
                        str(transaction_id),
                        _OTP_TTL_SECONDS,
                    )
                    if claimed:
                        break
                else:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Could not allocate a unique OTP; retry the request",
                    )

            try:
                async with httpx2.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        f"{config.NOTIFICATION_SERVICE_URL.rstrip('/')}"
                        "/v1/notifications/otp",
                        json={
                            "recipient": recipient,
                            "otp_code": otp_code,
                            "expires_at": (
                                datetime.now(timezone.utc)
                                + timedelta(seconds=otp_ttl)
                            ).isoformat(),
                        },
                    )
                    response.raise_for_status()
                await self.redis.set(
                    f"otp:sent:{transaction_id}",
                    "1",
                    ex=otp_ttl,
                )
            except (httpx2.HTTPError, KeyError) as exc:
                if isinstance(exc, httpx2.HTTPStatusError):
                    logger.error(
                        "OTP notification service returned HTTP %s",
                        exc.response.status_code,
                    )
                else:
                    logger.exception(
                        "OTP notification request failed (exception_type=%s)",
                        type(exc).__name__,
                    )
                await self.redis.eval(
                    _RELEASE_OTP_SCRIPT,
                    2,
                    otp_key,
                    active_otp_key,
                    otp_code,
                    str(transaction_id),
                )
                async with self.session.begin():
                    failed_transaction = await self.session.scalar(
                        select(Transactions)
                        .where(Transactions.transaction_id == transaction_id)
                        .with_for_update()
                    )
                    if (
                        failed_transaction is not None
                        and failed_transaction.status == StatusType.PENDING
                    ):
                        failed_transaction.status = StatusType.FAILED
                        failed_data = dict(failed_transaction.extra_data or {})
                        failed_data["payment_stage"] = "OTP_DELIVERY_FAILED"
                        failed_transaction.extra_data = failed_data
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Could not send the payment OTP",
                ) from exc
        finally:
            await self.redis.eval(
                _RELEASE_LOCK_SCRIPT,
                1,
                issue_lock_key,
                issue_token,
            )

    async def verify_payment_otp(
        self,
        transaction_id: uuid.UUID,
        otp_code: str,
        *,
        customer_id: uuid.UUID,
    ) -> Transactions:
        expiry_error = False
        attempts_exceeded = False
        wrong_code = False
        async with self.session.begin():
            transaction = await self.session.scalar(
                select(Transactions)
                .where(Transactions.transaction_id == transaction_id)
                .with_for_update()
            )
            if (
                transaction is None
                or (transaction.extra_data or {}).get("customer_id")
                != str(customer_id)
            ):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment transaction was not found",
                )
            if transaction.status != StatusType.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Only pending payments can be verified",
                )
            data = dict(transaction.extra_data or {})
            stage = data.get("payment_stage")
            if stage == "PROCESSING":
                return transaction
            if stage not in {"OTP_PENDING", "OTP_VERIFIED"}:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This payment is not waiting for OTP verification",
                )

            if stage == "OTP_PENDING":
                result = await self.redis.eval(
                    _CONSUME_OTP_SCRIPT,
                    4,
                    f"otp:transaction:{transaction_id}",
                    f"otp:active:{otp_code}",
                    f"otp:verified:{transaction_id}",
                    f"otp:attempts:{transaction_id}",
                    otp_code,
                    str(transaction_id),
                    _OTP_TTL_SECONDS,
                    _OTP_MAX_ATTEMPTS,
                    _OTP_VERIFY_TTL_SECONDS,
                )
                if result == -1:
                    transaction.status = StatusType.FAILED
                    data["payment_stage"] = "OTP_EXPIRED"
                    transaction.extra_data = data
                    expiry_error = True
                elif result == -2:
                    transaction.status = StatusType.FAILED
                    data["payment_stage"] = "OTP_ATTEMPTS_EXCEEDED"
                    transaction.extra_data = data
                    attempts_exceeded = True
                elif result == 0:
                    wrong_code = True
                elif result not in (1, 2):
                    raise RuntimeError(
                        f"Unexpected OTP verification result: {result}"
                    )

        if expiry_error:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="The payment OTP has expired; start a new payment",
            )
        if attempts_exceeded:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect OTP attempts; start a new payment",
            )
        if wrong_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The payment OTP is incorrect",
            )

        if transaction.tuition_id is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This payment is not associated with tuition",
            )
        try:
            tuition_details = await self.get_tuition_payment_details(
                transaction.tuition_id,
                data["student_id"],
            )
        except HTTPException as exc:
            if exc.status_code not in {
                status.HTTP_404_NOT_FOUND,
                status.HTTP_409_CONFLICT,
            }:
                raise
            async with self.session.begin():
                rejected_transaction = await self.session.scalar(
                    select(Transactions)
                    .where(Transactions.transaction_id == transaction_id)
                    .with_for_update()
                )
                if (
                    rejected_transaction is not None
                    and rejected_transaction.status == StatusType.PENDING
                ):
                    rejected_data = dict(rejected_transaction.extra_data or {})
                    rejected_data["payment_stage"] = "TUITION_NOT_PAYABLE"
                    rejected_transaction.extra_data = rejected_data
                    rejected_transaction.status = StatusType.FAILED
            return transaction
        if (
            tuition_details.status != "UNPAID"
            or tuition_details.amount != transaction.amount
            or tuition_details.merchant_account_id
            != uuid.UUID(data["merchant_account_id"])
        ):
            async with self.session.begin():
                rejected_transaction = await self.session.scalar(
                    select(Transactions)
                    .where(Transactions.transaction_id == transaction_id)
                    .with_for_update()
                )
                if (
                    rejected_transaction is not None
                    and rejected_transaction.status == StatusType.PENDING
                ):
                    rejected_data = dict(rejected_transaction.extra_data or {})
                    rejected_data["payment_stage"] = "TUITION_NOT_PAYABLE"
                    rejected_transaction.extra_data = rejected_data
                    rejected_transaction.status = StatusType.FAILED
            return transaction

        async with self.session.begin():
            await _lock_idempotency_key(
                self.session,
                f"tuition-payment:{transaction.tuition_id}",
            )
            transaction = await self.session.scalar(
                select(Transactions)
                .where(Transactions.transaction_id == transaction_id)
                .with_for_update()
            )
            if transaction is None or transaction.status != StatusType.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Payment is no longer pending",
                )
            data = dict(transaction.extra_data or {})
            if data.get("payment_stage") == "PROCESSING":
                return transaction
            active_payment = await self.session.scalar(
                select(Transactions)
                .where(
                    Transactions.tuition_id == transaction.tuition_id,
                    Transactions.transaction_id != transaction_id,
                    (
                        (Transactions.status == StatusType.SUCCESS)
                        | (
                            (Transactions.status == StatusType.PENDING)
                            & (
                                Transactions.extra_data["payment_stage"].astext
                                == "PROCESSING"
                            )
                        )
                    ),
                )
                .order_by(Transactions.create_at.desc())
                .limit(1)
                .with_for_update()
            )
            if active_payment is not None:
                if active_payment.status == StatusType.SUCCESS:
                    data["payment_stage"] = "TUITION_ALREADY_PAID"
                    transaction.status = StatusType.FAILED
                else:
                    data["payment_stage"] = "OTP_VERIFIED"
                transaction.extra_data = data
                return transaction

            data["payment_stage"] = "PROCESSING"
            transaction.extra_data = data
            self.session.add(
                Outbox_Events(
                    aggregate_type="payment",
                    aggregate_id=str(transaction.transaction_id),
                    event_type="payment.created",
                    payload={
                        "transaction_id": str(transaction.transaction_id),
                        "customer_id": data["customer_id"],
                        "account_id": str(transaction.account_id),
                        "tuition_id": str(transaction.tuition_id),
                        "amount": str(transaction.amount),
                        "description": transaction.description,
                        "status": StatusType.PENDING.name,
                        "merchant_account_id": data["merchant_account_id"],
                        "student_name": data["student_name"],
                        "customer_email": data["customer_email"],
                    },
                )
            )

        return transaction

    async def apply_account_debit_result(
        self,
        transaction_id: uuid.UUID,
        *,
        succeeded: bool,
        failure_reason: str | None = None,
    ) -> Transactions:
        """Apply the account service's debit result and publish payment success."""
        async with self.session.begin():
            payment_reference = await self.session.scalar(
                select(Transactions).where(
                    Transactions.transaction_id == transaction_id
                )
            )
            if payment_reference is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payment transaction was not found",
                )
            if payment_reference.tuition_id is not None:
                await _lock_idempotency_key(
                    self.session,
                    f"tuition-payment:{payment_reference.tuition_id}",
                )
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
            if (transaction.extra_data or {}).get("payment_stage") != "PROCESSING":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Payment cannot be debited before OTP verification",
                )

            transaction.status = target_status
            if succeeded and transaction.tuition_id is not None:
                other_pending_payments = (
                    await self.session.scalars(
                        select(Transactions)
                        .where(
                            Transactions.tuition_id == transaction.tuition_id,
                            Transactions.transaction_id != transaction_id,
                            Transactions.status == StatusType.PENDING,
                        )
                        .with_for_update()
                    )
                ).all()
                for other_payment in other_pending_payments:
                    other_data = dict(other_payment.extra_data or {})
                    other_data["payment_stage"] = "TUITION_ALREADY_PAID"
                    other_payment.extra_data = other_data
                    other_payment.status = StatusType.FAILED
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
                        "customer_email": (
                            (transaction.extra_data or {}).get("customer_email")
                        ),
                        "paid_at": datetime.now(timezone.utc).isoformat(),
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
