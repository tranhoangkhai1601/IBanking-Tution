from fastapi import FastAPI
from config import config
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    from init_db import init_models
    await init_models()
    yield

app = FastAPI(title="Auth Service", version="1.0.0", lifespan=lifespan)



@app.get("/health")
async def health_check():
    return {
        "status": "running",
        "environment": config.DATABASE_URL
    }