
from fastapi import FastAPI
from routes.v1.auth_login import auth_router
from config import config

IS_PROD = config.SERVER_ENV == "production"
app = FastAPI(
            title=config.PROJECT_NAME,
            version=config.PROJECT_VERSION,
            docs_url=None if IS_PROD else "/docs",
            redoc_url=None if IS_PROD else "/redoc",
            openapi_url=None if IS_PROD else "/openapi.json")

app.include_router(auth_router)

