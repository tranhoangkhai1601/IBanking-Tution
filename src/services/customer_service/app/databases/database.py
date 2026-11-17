
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import config
from databases.models import Base
import redis.asyncio as redis

postgres_db = config.DATABASE_URL

async_engine = create_async_engine(postgres_db, echo=True,future=True)

async_session_local = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS transaction_lines_default "
                "PARTITION OF transaction_lines DEFAULT"
            )
        )

async def get_session() -> AsyncSession:
    async with async_session_local() as session:
        yield session

redis_url = f"redis://:{config.REDIS_PASS}@{config.REDIS_HOST}:{config.REDIS_PORT}/0"

redis_client = redis.from_url(redis_url, decode_responses=True)

async def get_redis() -> redis.Redis:
    yield redis_client