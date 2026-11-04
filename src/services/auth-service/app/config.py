from pydantic_settings import BaseSettings

class Configs(BaseSettings):
    DATABASE_URL: str

    class Config:
        env_file = ".env"
        extra = "ignore"

config = Configs()