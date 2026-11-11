from pydantic_settings import BaseSettings, SettingsConfigDict

class Config(BaseSettings):
    DATABASE_URL: str
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

    model_config = SettingsConfigDict(extra="ignore")

config = Config()