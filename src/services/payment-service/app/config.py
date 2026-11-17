from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import quote

class Config(BaseSettings):
    DATABASE_URL: str
    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: int
    TUITION_SERVICE_URL: str
    RABBITMQ_DEFAULT_USER: str
    RABBITMQ_DEFAULT_PASS: str
    RABBITMQ_HOST: str
    RABBITMQ_PORT: int

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