from sqlalchemy import create_async_engine 
import config

Postgresql_DB_URL = config.DATABASE_AUTH_URL

print(Postgresql_DB_URL)