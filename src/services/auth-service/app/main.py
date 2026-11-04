from fastapi import FastAPI
from config import config

app = FastAPI(title="Auth Service", version="1.0.0")

@app.get("/health")
async def health_check():
    return {
        "status": "running",
        "environment": config.DATABASE_URL
    }