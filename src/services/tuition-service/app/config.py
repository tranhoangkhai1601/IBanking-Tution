
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from urllib.parse import quote

class Config(BaseSettings):
    DATABASE_URL: str
    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: int
    MERCHANT: str
    MERCHANT_ACCOUNT_ID: str = Field(validation_alias="CUSTOMER_5_ACCOUNT_1")
    RABBITMQ_DEFAULT_USER: str
    RABBITMQ_DEFAULT_PASS: str
    RABBITMQ_HOST: str
    RABBITMQ_PORT: int
    NOTIFICATION_SERVICE_URL: str = "http://notification_service:8080"

    model_config = SettingsConfigDict(extra="ignore")

    @property
    def RABBITMQ_URL(self) -> str:
        user = quote(self.RABBITMQ_DEFAULT_USER, safe="")
        password = quote(self.RABBITMQ_DEFAULT_PASS, safe="")
        return (
            f"amqp://{user}:{password}@"
            f"{self.RABBITMQ_HOST}:{self.RABBITMQ_PORT}/"
        )

config = Config()