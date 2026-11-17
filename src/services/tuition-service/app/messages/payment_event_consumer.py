import asyncio
import json
import logging
from decimal import Decimal
from decimal import InvalidOperation
from uuid import UUID

import aio_pika
import httpx2
from sqlalchemy import select

from config import config
from databases.database import async_session_local, redis_client
from databases.models import statusType, tuition


logger = logging.getLogger(__name__)
_QUEUE_NAME = "payment.events"


async def _apply_payment_succeeded(event: dict) -> None:
    payload = event["payload"]
    tuition_id = UUID(payload["tuition_id"])
    amount = Decimal(payload["amount"])
    transaction_id = UUID(payload["transaction_id"])
    customer_email = payload["customer_email"]
    paid_at = payload["paid_at"]

    async with async_session_local() as session:
        async with session.begin():
            tuition_record = await session.scalar(
                select(tuition)
                .where(tuition.tuition_id == tuition_id)
                .with_for_update()
            )
            if tuition_record is None:
                raise ValueError(f"Tuition {tuition_id} was not found")
            if tuition_record.amount != amount:
                raise ValueError(
                    f"Payment amount does not match tuition {tuition_id}"
                )
            if tuition_record.status == statusType.UNPAID:
                tuition_record.status = statusType.PAID
            elif tuition_record.status != statusType.PAID:
                raise ValueError(
                    f"Tuition {tuition_id} is not in a payable state"
                )
            student_id = tuition_record.student_id

    await redis_client.delete(f"tuition:student:{student_id.upper()}")
    async with httpx2.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{config.NOTIFICATION_SERVICE_URL.rstrip('/')}"
            "/v1/notifications/payment-success",
            json={
                "recipient": customer_email,
                "transaction_id": str(transaction_id),
                "tuition_id": str(tuition_id),
                "amount": str(amount),
                "paid_at": paid_at,
            },
        )
        response.raise_for_status()


async def _consume_payment_message(message: aio_pika.IncomingMessage) -> None:
    try:
        event = json.loads(message.body)
        if event.get("event_type") != "payment.succeeded":
            await message.ack()
            return
        if not event.get("payload", {}).get("tuition_id"):
            await message.ack()
            return
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
        logger.exception("Rejecting malformed payment event")
        await message.reject(requeue=False)
        return

    try:
        await _apply_payment_succeeded(event)
    except (InvalidOperation, KeyError, TypeError, ValueError):
        logger.exception("Rejecting invalid payment success event")
        await message.reject(requeue=False)
        return
    except Exception:
        logger.exception("Payment event handling failed; requeueing")
        await message.nack(requeue=True)
        return

    await message.ack()


async def consume_payment_events(
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
                await queue.consume(_consume_payment_message)
                await stop_event.wait()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Tuition payment-event consumer failed; retrying")
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=2)
            except TimeoutError:
                pass
