
from fastapi import FastAPI, status
from contextlib import asynccontextmanager
import asyncio

from config import config
from databases.database import async_session_local, async_engine, init_db, redis_client
from databases.scripts.seed import seed_customer_data
from messages.outbox_publisher import publish_customer_outbox
from messages.payment_debit_consumer import consume_payment_commands
from routers.v1.customer import customerRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    await init_db()

    async with async_session_local() as session:
        async with session.begin():
            await seed_customer_data(session)

    stop_event = asyncio.Event()
    publisher_task = asyncio.create_task(
        publish_customer_outbox(stop_event, config.RABBITMQ_URL)
    )
    consumer_task = asyncio.create_task(
        consume_payment_commands(stop_event, config.RABBITMQ_URL)
    )
    yield
    stop_event.set()
    for task in (publisher_task, consumer_task):
        task.cancel()
    await asyncio.gather(publisher_task, consumer_task, return_exceptions=True)
    await redis_client.aclose()
    await async_engine.dispose()

app = FastAPI(lifespan=lifespan)
app.include_router(customerRouter)

@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }