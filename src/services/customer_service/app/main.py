
from fastapi import FastAPI, status
from contextlib import asynccontextmanager

from databases.database import async_session_local, async_engine, init_db, get_session

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    await init_db()

    async with async_session_local() as session:
        async with session.begin():
            pass

    yield
    await async_engine.dispose()

app = FastAPI(lifespan=lifespan)

@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }