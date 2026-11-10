from pydantic_settings import BaseSettings, SettingsConfigDict

class Configs(BaseSettings):
    DATABASE_URL: str
    SERVER_ENV: str
    PROJECT_NAME: str
    PROJECT_VERSION: str
    
    model_config = SettingsConfigDict(extra="ignore")

config = Configs()