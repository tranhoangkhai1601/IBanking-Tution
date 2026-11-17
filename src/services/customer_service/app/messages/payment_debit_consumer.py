"""Debit selected customer accounts for payment commands."""

import asyncio
import hashlib
import json
import logging
from decimal import Decimal, InvalidOperation
from uuid import UUID

import aio_pika
from sqlalchemy import select, text

from databases.database import async_session_local, redis_client
from databases.models import (
    AccountType,
    EntryTypeEnum,
    OutBoxStatus,
    customer_details,
    outbox_events,
    transaction_lines,
)


logger = logging.getLogger(__name__)
_QUEUE_NAME = "payment.commands"
def _result_event(
    *,
    event_type: str,
    transaction_id: UUID,
    account_id: UUID,
    customer_id: UUID,
    amount: Decimal,
    tuition_id: str | None,
    merchant_account_id: UUID | None,
    reason: str | None = None,
) -> outbox_events:
    return outbox_events(
        aggregate_type="account",
        aggregate_id=str(account_id),
        event_type=event_type,
        payload={
            "transaction_id": str(transaction_id),
            "account_id": str(account_id),
            "customer_id": str(customer_id),
            "tuition_id": tuition_id,
            "merchant_account_id": (
                str(merchant_account_id) if merchant_account_id else None
            ),
            "amount": str(amount),
            "reason": reason,
        },
        status=OutBoxStatus.NOTSEND,
    )


async def _apply_payment_command(event: dict) -> None:
    payload = event.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("Payment command payload must be an object")

    transaction_id = UUID(payload["transaction_id"])
    account_id = UUID(payload["account_id"])
    customer_id = UUID(payload["customer_id"])
    tuition_id = payload.get("tuition_id")
    merchant_account_value = payload.get("merchant_account_id")
    merchant_account_id = (
        UUID(merchant_account_value) if merchant_account_value else None
    )
    student_name = payload.get("student_name")
    amount = Decimal(payload["amount"])
    if (
        not amount.is_finite()
        or amount <= 0
        or amount >= Decimal("1000000000000000")
        or amount.as_tuple().exponent < -4
    ):
        raise ValueError("Payment amount must fit Numeric(19, 4) and be positive")

    customer_ids_to_invalidate: set[UUID] = set()
    async with async_session_local() as session:
        async with session.begin():
            lock_bytes = hashlib.sha256(
                f"customer-payment-command:{transaction_id}".encode("utf-8")
            ).digest()[:8]
            command_lock_id = int.from_bytes(
                lock_bytes,
                byteorder="big",
                signed=True,
            )
            await session.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": command_lock_id},
            )
            prior_result = await session.scalar(
                select(outbox_events).where(
                    outbox_events.event_type.in_(
                        [
                            "account.debit_succeeded",
                            "account.debit_failed",
                        ]
                    ),
                    outbox_events.payload["transaction_id"].astext
                    == str(transaction_id),
                )
            )
            if prior_result is not None:
                if (
                    prior_result.payload.get("account_id") != str(account_id)
                    or prior_result.payload.get("customer_id") != str(customer_id)
                    or prior_result.payload.get("amount") != str(amount)
                    or prior_result.payload.get("tuition_id") != tuition_id
                    or (
                        prior_result.payload.get("merchant_account_id")
                        and prior_result.payload.get("merchant_account_id")
                        != str(merchant_account_id)
                    )
                ):
                    raise ValueError(
                        "Payment command conflicts with the existing debit result"
                    )
            account_ids = {account_id}
            if merchant_account_id is not None:
                account_ids.add(merchant_account_id)
            locked_accounts = list(
                (
                    await session.scalars(
                        select(customer_details)
                        .where(customer_details.account_id.in_(account_ids))
                        .order_by(customer_details.account_id)
                        .with_for_update()
                    )
                ).all()
            )
            accounts_by_id = {account.account_id: account for account in locked_accounts}
            account = accounts_by_id.get(account_id)
            merchant_account = (
                accounts_by_id.get(merchant_account_id)
                if merchant_account_id is not None
                else None
            )

            if prior_result is not None:
                failure_reason = None
                result_type = prior_result.event_type
                if result_type == "account.debit_succeeded":
                    if merchant_account is None:
                        raise ValueError(
                            "Successful payment is missing its merchant account"
                        )
                    customer_ids_to_invalidate.update(
                        {customer_id, merchant_account.customer_id}
                    )
                    existing_merchant_line = await session.scalar(
                        select(transaction_lines.entry_id)
                        .where(
                            transaction_lines.transaction_id == transaction_id,
                            transaction_lines.account_id == merchant_account.account_id,
                            transaction_lines.entry_type == EntryTypeEnum.IN,
                        )
                        .limit(1)
                    )
                    if existing_merchant_line is None:
                        if (
                            merchant_account.account_type
                            != AccountType.organization
                        ):
                            raise ValueError(
                                "Payment recipient is not an organization account"
                            )
                        merchant_account.balance += amount
                        session.add(
                            transaction_lines(
                                account_id=merchant_account.account_id,
                                transaction_id=transaction_id,
                                amount=amount,
                                entry_type=EntryTypeEnum.IN,
                                description="Tuition payment received",
                                extra_data={
                                    "tuition_id": tuition_id,
                                    "payer_account_id": str(account_id),
                                    "payer_customer_id": str(customer_id),
                                    "merchant_account_id": str(
                                        merchant_account.account_id
                                    ),
                                    "student_name": student_name,
                                    "payment_event_id": event.get("event_id"),
                                },
                            )
                        )
                        customer_ids_to_invalidate.add(merchant_account.customer_id)
            else:
                failure_reason = None
                if merchant_account_id is None:
                    failure_reason = "MERCHANT_ACCOUNT_NOT_FOUND"
                elif merchant_account_id == account_id:
                    failure_reason = "INVALID_MERCHANT_ACCOUNT"
                elif account is None:
                    failure_reason = "ACCOUNT_NOT_FOUND"
                elif account.customer_id != customer_id:
                    failure_reason = "ACCOUNT_NOT_OWNED"
                elif merchant_account is None:
                    failure_reason = "MERCHANT_ACCOUNT_NOT_FOUND"
                elif merchant_account.account_type != AccountType.organization:
                    failure_reason = "INVALID_MERCHANT_ACCOUNT"
                elif not merchant_account.account_active:
                    failure_reason = "MERCHANT_ACCOUNT_INACTIVE"
                else:
                    existing_line = await session.scalar(
                        select(transaction_lines.entry_id)
                        .where(
                            transaction_lines.transaction_id == transaction_id,
                            transaction_lines.account_id == account_id,
                            transaction_lines.entry_type == EntryTypeEnum.OUT,
                        )
                        .limit(1)
                    )
                    if existing_line is not None:
                        existing_merchant_line = await session.scalar(
                            select(transaction_lines.entry_id)
                            .where(
                                transaction_lines.transaction_id == transaction_id,
                                transaction_lines.account_id
                                == merchant_account.account_id,
                                transaction_lines.entry_type == EntryTypeEnum.IN,
                            )
                            .limit(1)
                        )
                        if existing_merchant_line is None:
                            merchant_account.balance += amount
                            session.add(
                                transaction_lines(
                                    account_id=merchant_account.account_id,
                                    transaction_id=transaction_id,
                                    amount=amount,
                                    entry_type=EntryTypeEnum.IN,
                                    description="Tuition payment received",
                                    extra_data={
                                        "tuition_id": tuition_id,
                                        "payer_account_id": str(account_id),
                                        "payer_customer_id": str(customer_id),
                                        "merchant_account_id": str(
                                            merchant_account.account_id
                                        ),
                                        "student_name": student_name,
                                        "payment_event_id": event.get("event_id"),
                                    },
                                )
                            )
                            customer_ids_to_invalidate.add(
                                merchant_account.customer_id
                            )
                        customer_ids_to_invalidate.add(customer_id)
                    elif not account.account_active:
                        failure_reason = "ACCOUNT_INACTIVE"
                    elif account.balance < amount:
                        failure_reason = "INSUFFICIENT_FUNDS"
                    elif merchant_account.balance + amount >= Decimal(
                        "1000000000000000"
                    ):
                        failure_reason = "MERCHANT_BALANCE_LIMIT"
                    else:
                        account.balance -= amount
                        merchant_account.balance += amount
                        customer_ids_to_invalidate.update(
                            {account.customer_id, merchant_account.customer_id}
                        )
                        session.add(
                            transaction_lines(
                                account_id=account_id,
                                transaction_id=transaction_id,
                                amount=amount,
                                entry_type=EntryTypeEnum.OUT,
                                description="Tuition payment",
                                extra_data={
                                    "tuition_id": tuition_id,
                                    "merchant_account_id": str(merchant_account_id),
                                    "student_name": student_name,
                                    "payment_event_id": event.get("event_id"),
                                },
                            )
                        )
                        session.add(
                            transaction_lines(
                                account_id=merchant_account.account_id,
                                transaction_id=transaction_id,
                                amount=amount,
                                entry_type=EntryTypeEnum.IN,
                                description="Tuition payment received",
                                extra_data={
                                    "tuition_id": tuition_id,
                                    "payer_account_id": str(account_id),
                                    "payer_customer_id": str(customer_id),
                                    "merchant_account_id": str(
                                        merchant_account.account_id
                                    ),
                                    "student_name": student_name,
                                    "payment_event_id": event.get("event_id"),
                                },
                            )
                        )
                result_type = (
                    "account.debit_failed"
                    if failure_reason
                    else "account.debit_succeeded"
                )
            if prior_result is None:
                session.add(
                    _result_event(
                        event_type=result_type,
                        transaction_id=transaction_id,
                        account_id=account_id,
                        customer_id=customer_id,
                        amount=amount,
                        tuition_id=tuition_id,
                        merchant_account_id=merchant_account_id,
                        reason=failure_reason,
                    )
                )
    for affected_customer_id in customer_ids_to_invalidate:
        await redis_client.delete(f"customer:account:{affected_customer_id}")
        await redis_client.delete(
            f"customer:transaction_history:v6:{affected_customer_id}"
        )


async def _consume_payment_command(message: aio_pika.IncomingMessage) -> None:
    try:
        event = json.loads(message.body)
        if not isinstance(event, dict):
            raise ValueError("Event body must be a JSON object")
        if event.get("event_type") != "payment.created":
            await message.ack()
            return
        await _apply_payment_command(event)
    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
        InvalidOperation,
        KeyError,
        TypeError,
        ValueError,
    ):
        logger.exception("Rejecting malformed payment debit command")
        await message.reject(requeue=False)
        return
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("Payment debit failed; requeueing command")
        await message.nack(requeue=True)
        return

    await message.ack()


async def consume_payment_commands(
    stop_event: asyncio.Event,
    rabbitmq_url: str,
) -> None:
    while not stop_event.is_set():
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=1)
                queue = await channel.declare_queue(_QUEUE_NAME, durable=True)
                await queue.consume(_consume_payment_command)
                await stop_event.wait()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Customer payment-command consumer failed; retrying")
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=2)
            except TimeoutError:
                pass
