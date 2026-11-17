from fastapi import FastAPI, status

from routers.v1.notification import router

app = FastAPI()
app.include_router(router)


@app.get("/health", status_code=status.HTTP_200_OK)
async def get_health():
    return {"server": "healthy"}