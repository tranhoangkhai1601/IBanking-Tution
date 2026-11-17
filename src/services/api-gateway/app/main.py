
from fastapi import FastAPI
from routes.v1.auth_login_logout import auth_router
from routes.v1.customers_profile import customerRouter
from routes.v1.payment import payment_router
from routes.v1.tuition import tuition_router
from config import config

IS_PROD = config.SERVER_ENV == "production"
app = FastAPI(
            title=config.PROJECT_NAME,
            version=config.PROJECT_VERSION,
            docs_url=None if IS_PROD else "/docs",
            redoc_url=None if IS_PROD else "/redoc",
            openapi_url=None if IS_PROD else "/openapi.json")

app.include_router(auth_router)
app.include_router(customerRouter)
app.include_router(payment_router)
app.include_router(tuition_router)
