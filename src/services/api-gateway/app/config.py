
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SERVER_ENV: str
    PROJECT_NAME: str
    PROJECT_VERSION: str
    AUTH_SERVICE_URL: str
    PAYMENT_SERVICE_URL: str
    CUSTOMER_SERVICE_URL: str
    TUITION_SERVICE_URL: str

config = Settings()
