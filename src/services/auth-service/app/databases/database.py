from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import config
from databases.models import Base
import redis.asyncio as redis

postgres_db_url = config.DATABASE_URL

async_engine = create_async_engine(postgres_db_url, echo=True, future=True,)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

redis_url = f"redis://:{config.REDIS_PASS}@{config.REDIS_HOST}:{config.REDIS_PORT}/0"
redis_client = redis.from_url(redis_url, decode_responses=True)

async def get_redis() -> redis.Redis:
    yield redis_client