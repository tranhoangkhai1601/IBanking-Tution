
from fastapi import FastAPI, status, HTTPException
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from databases.database import init_db, get_session, async_engine, AsyncSessionLocal
from databases.models import auth_credentials, matrix_permission, auth_sessions
from config import config
from databases.scripts.seed import seed_auth_db
from routers.v1.auth import authRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    async with AsyncSessionLocal() as session:
        async with session.begin():
            await seed_auth_db(session)

    yield
    await async_engine.dispose()

IS_PROD = config.SERVER_ENV == "production"

app = FastAPI(lifespan=lifespan,
              title=config.PROJECT_NAME,
              version=config.PROJECT_VERSION,
              docs_url=None if IS_PROD else "/docs",
              redoc_url=None if IS_PROD else "/redoc",
              openapi_url=None if IS_PROD else "/openapi.json")
app.include_router(router=authRouter, tags=["auth"])


@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {
        "server": "healthy"
    }