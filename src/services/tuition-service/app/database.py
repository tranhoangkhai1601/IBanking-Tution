
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import config

postgres_db = config.DATABASE_URL

async_engine = create_async_engine(postgres_db, echo=True, future=True)

async_session_local = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False
)

