from fastapi import FastAPI

from routers.v1.notification import router

app = FastAPI()
app.include_router(router)