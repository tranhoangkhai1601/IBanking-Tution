
from fastapi import FastAPI, status, HTTPException
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from databases.database import init_db, get_session, async_engine, AsyncSessionLocal, redis_client
from databases.models import auth_credentials, matrix_permission, auth_sessions
from config import config
from databases.scripts.seed import seed_auth_db
from routers.v1.auth import authRouter
from cached.load_permission import load_permission

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await seed_auth_db(session)
            await load_permission(session, redis_client)

    yield
    await redis_client.aclose()
    await async_engine.dispose()

app = FastAPI(lifespan=lifespan,
              version=config.PROJECT_VERSION)
app.include_router(router=authRouter)


@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }