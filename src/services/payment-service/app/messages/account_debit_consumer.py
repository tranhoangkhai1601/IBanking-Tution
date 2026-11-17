
import asyncio
import json
import logging
import uuid

import aio_pika
from fastapi import HTTPException

from databases.database import async_session_local, redis_client
from services.payment_service import PaymentService


logger = logging.getLogger(__name__)
_QUEUE_NAME = "customer.events"


async def _handle_account_debit_result(event: dict) -> None:
    event_type = event.get("event_type")
    if event_type not in {"account.debit_succeeded", "account.debit_failed"}:
        return

    payload = event.get("payload")
    if not isinstance(payload, dict) or not payload.get("transaction_id"):
        raise ValueError("Account debit result is missing transaction_id")

    async with async_session_local() as session:
        service = PaymentService(session, redis_client)
        try:
            await service.apply_account_debit_result(
                uuid.UUID(payload["transaction_id"]),
                succeeded=event_type == "account.debit_succeeded",
                failure_reason=payload.get("reason"),
            )
        except HTTPException as exc:
            if exc.status_code == 404:
                raise ValueError("Account debit references an unknown payment") from exc
            raise


async def _consume_account_debit_result(
    message: aio_pika.IncomingMessage,
) -> None:
    try:
        event = json.loads(message.body)
        if not isinstance(event, dict):
            raise ValueError("Event body must be a JSON object")
        await _handle_account_debit_result(event)
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        logger.exception("Rejecting malformed account debit result")
        await message.reject(requeue=False)
        return
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("Account debit result handling failed; requeueing")
        await message.nack(requeue=True)
        return

    await message.ack()


async def consume_account_debit_results(
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
                await queue.consume(_consume_account_debit_result)
                await stop_event.wait()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Payment debit-result consumer failed; retrying")
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=2)
            except TimeoutError:
                pass
