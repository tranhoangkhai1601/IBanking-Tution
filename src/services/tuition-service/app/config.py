
from pydantic_settings import BaseSettings, SettingsConfigDict

class Config(BaseSettings):
    DATABASE_URL: str
    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: int

    model_config = SettingsConfigDict(extra="ignore")
config = Config()