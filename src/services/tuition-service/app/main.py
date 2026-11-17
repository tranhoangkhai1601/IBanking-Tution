
from fastapi import FastAPI, status
import asyncio
from contextlib import asynccontextmanager
from config import config
from databases.database import async_engine, async_session_local, init_db, redis_client
from databases.scripts.seed import seed_tuition_data
from routers.v1.tuition import tuition_router
from messages.payment_event_consumer import consume_payment_events

@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_db()

    async with async_session_local() as session:
        async with session.begin():
            await seed_tuition_data(session)

    stop_event = asyncio.Event()
    consumer_task = asyncio.create_task(
        consume_payment_events(stop_event, config.RABBITMQ_URL)
    )
    yield
    stop_event.set()
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    await redis_client.aclose()
    await async_engine.dispose()
    
    
app = FastAPI(lifespan=lifespan)
app.include_router(tuition_router)

@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }