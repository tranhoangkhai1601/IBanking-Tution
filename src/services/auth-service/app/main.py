import uuid
from fastapi import FastAPI, status, HTTPException
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from database import init_db, get_session, async_engine, AsyncSessionLocal
from models import Auth_Credentials, Matrix_Permission, Auth_Sessions

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    async with AsyncSessionLocal() as session:
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