
from fastapi import FastAPI, status
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from databases.database import async_engine, async_session_local, init_db
from databases.scripts.seed import seed_tuition_data

@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_db()

    async with async_session_local() as session:
        async with session.begin():
            await seed_tuition_data(session)

    yield


    await async_engine.dispose()
    
    
app = FastAPI(lifespan=lifespan)

@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }