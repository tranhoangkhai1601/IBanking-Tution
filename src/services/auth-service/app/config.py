from pydantic_settings import BaseSettings, SettingsConfigDict

class Configs(BaseSettings):
    DATABASE_URL: str
    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: int
    PROJECT_VERSION: str
    CUSTOMER_1: str
    CUSTOMER_2: str
    CUSTOMER_3: str
    MODERATOR: str
    MERCHANT: str
    PASSWORD: str = "123456"

    model_config = SettingsConfigDict(extra="ignore")

config = Configs()