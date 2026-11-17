
from pydantic_settings import BaseSettings, SettingsConfigDict

class Configs(BaseSettings):
    DATABASE_URL: str
    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: int
    PROJECT_VERSION: str

    JWT_TOKEN: str
    JWT_REFRESH_TOKEN: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int


    CUSTOMER_1: str
    CUSTOMER_2: str
    CUSTOMER_3: str
    MODERATOR: str
    MERCHANT: str
    PASSWORD: str = "123456"

    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: str

    model_config = SettingsConfigDict(extra="ignore")

config = Configs()