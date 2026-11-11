
import httpx2
from fastapi import APIRouter, HTTPException, status, Request
from config import config

auth_router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@auth_router.post("/login")
async def forward_login_to_auth_service(request: Request):

    body = await request.json()

    async with httpx2.AsyncClient() as client:
        try:
            response = await client.post(
                f"{config.AUTH_SERVICE_URL}/login",
                json=body,
                timeout=5.0
            )

            response.raise_for_status()

            return response.json()
        except httpx2.HTTPStatusError as exc:
            raise HTTPException (
                status_code=exc.response.status_code,
                detail=exc.response.json().get("detail", "Error")
            )
        except httpx2.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail="Auth Service is disconnected"
            )