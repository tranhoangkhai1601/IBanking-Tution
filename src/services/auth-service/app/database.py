from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from config import config

postgres_db_url = config.DATABASE_URL

async_engine = create_async_engine(postgres_db_url, echo=True, future=True,)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
)
