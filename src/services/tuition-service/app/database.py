
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import config
from models import Base

postgres_db = config.DATABASE_URL

async_engine = create_async_engine(postgres_db, echo=True, future=True)

async_session_local = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False
)

async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    async with async_session_local() as session:
        yield session