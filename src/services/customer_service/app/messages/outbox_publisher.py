"""Publish committed Customer Service outbox events to RabbitMQ."""

import asyncio
import json
import logging

import aio_pika
from sqlalchemy import select

from databases.database import async_session_local
from databases.models import OutBoxStatus, outbox_events


logger = logging.getLogger(__name__)
_QUEUE_NAME = "customer.events"
_RESULT_EVENT_TYPES = (
    "account.debit_succeeded",
    "account.debit_failed",
)


async def publish_customer_outbox(
    stop_event: asyncio.Event,
    rabbitmq_url: str,
) -> None:
    while not stop_event.is_set():
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            async with connection:
                channel = await connection.channel(publisher_confirms=True)
                await channel.declare_queue(_QUEUE_NAME, durable=True)
                while not stop_event.is_set():
                    async with async_session_local() as session:
                        async with session.begin():
                            events = list(
                                (
                                    await session.scalars(
                                        select(outbox_events)
                                        .where(
                                            outbox_events.event_type.in_(
                                                _RESULT_EVENT_TYPES
                                            ),
                                            outbox_events.status.in_(
                                                [
                                                    OutBoxStatus.NOTSEND,
                                                    OutBoxStatus.FAILED,
                                                ]
                                            ),
                                        )
                                        .order_by(outbox_events.create_at)
                                        .limit(50)
                                        .with_for_update(skip_locked=True)
                                    )
                                ).all()
                            )

                            for event in events:
                                body = json.dumps(
                                    {
                                        "event_id": str(event.event_id),
                                        "event_type": event.event_type,
                                        "aggregate_id": event.aggregate_id,
                                        "payload": event.payload,
                                    }
                                ).encode("utf-8")
                                await channel.default_exchange.publish(
                                    aio_pika.Message(
                                        body=body,
                                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                                    ),
                                    routing_key=_QUEUE_NAME,
                                    mandatory=True,
                                )
                                event.status = OutBoxStatus.SUCCESS

                    if not events:
                        try:
                            await asyncio.wait_for(stop_event.wait(), timeout=1)
                        except TimeoutError:
                            pass
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Customer outbox publisher failed; retrying")
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=2)
            except TimeoutError:
                pass
