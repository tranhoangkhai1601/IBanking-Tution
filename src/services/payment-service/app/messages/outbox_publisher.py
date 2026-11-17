"""Publish committed Payment Service outbox events to RabbitMQ."""

import asyncio
import json
import logging

import aio_pika
from sqlalchemy import select

from databases.database import async_session_local
from databases.models import OutBoxStatus, Outbox_Events


logger = logging.getLogger(__name__)
_QUEUE_NAME = "payment.events"
_COMMAND_QUEUE_NAME = "payment.commands"


async def publish_payment_outbox(
    stop_event: asyncio.Event,
    rabbitmq_url: str,
) -> None:
    while not stop_event.is_set():
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            async with connection:
                channel = await connection.channel(publisher_confirms=True)
                await channel.declare_queue(_QUEUE_NAME, durable=True)
                await channel.declare_queue(_COMMAND_QUEUE_NAME, durable=True)
                while not stop_event.is_set():
                    async with async_session_local() as session:
                        async with session.begin():
                            events = list(
                                (
                                    await session.scalars(
                                        select(Outbox_Events)
                                        .where(
                                            Outbox_Events.status.in_(
                                                [
                                                    OutBoxStatus.NOTSEND,
                                                    OutBoxStatus.FAILED,
                                                ]
                                            )
                                        )
                                        .order_by(Outbox_Events.create_at)
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
                                    routing_key=(
                                        _COMMAND_QUEUE_NAME
                                        if event.event_type == "payment.created"
                                        else _QUEUE_NAME
                                    ),
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
            logger.exception("Payment outbox publisher failed; retrying")
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=2)
            except TimeoutError:
                pass
