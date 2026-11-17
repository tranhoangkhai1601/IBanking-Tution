from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import quote

class Config(BaseSettings):
    DATABASE_URL: str
    TUITION_SERVICE_URL: str
    REDIS_HOST: str
    REDIS_PASS: str
    REDIS_PORT: int
    PROJECT_VERSION: str
    CUSTOMER_1: str
    CUSTOMER_2: str
    CUSTOMER_3: str
    MODERATOR: str
    MERCHANT: str

    CUSTOMER_1_ACCOUNT_1: str
    CUSTOMER_1_ACCOUNT_2: str

    CUSTOMER_2_ACCOUNT_1: str
    CUSTOMER_2_ACCOUNT_2: str

    CUSTOMER_3_ACCOUNT_1: str

    CUSTOMER_4_ACCOUNT_1: str

    CUSTOMER_5_ACCOUNT_1: str

    CUSTOMER_1_ACCOUNT_NUM1: str
    CUSTOMER_1_ACCOUNT_NUM2: str
    
    CUSTOMER_2_ACCOUNT_NUM1: str
    CUSTOMER_2_ACCOUNT_NUM2: str

    CUSTOMER_3_ACCOUNT_NUM1: str

    CUSTOMER_4_ACCOUNT_NUM1: str

    CUSTOMER_5_ACCOUNT_NUM1: str

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