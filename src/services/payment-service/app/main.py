
from fastapi import FastAPI, status
from contextlib import asynccontextmanager
import asyncio

from config import config
from databases.database import async_engine, init_db, redis_client
from routers.v1.payment import payment_router
from messages.account_debit_consumer import consume_account_debit_results
from messages.outbox_publisher import publish_payment_outbox

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    stop_event = asyncio.Event()
    publisher_task = asyncio.create_task(
        publish_payment_outbox(stop_event, config.RABBITMQ_URL)
    )
    consumer_task = asyncio.create_task(
        consume_account_debit_results(stop_event, config.RABBITMQ_URL)
    )
    yield
    stop_event.set()
    for task in (publisher_task, consumer_task):
        task.cancel()
    await asyncio.gather(publisher_task, consumer_task, return_exceptions=True)
    await redis_client.aclose()
    await async_engine.dispose()


app = FastAPI(lifespan=lifespan)
app.include_router(payment_router)

@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }