
import httpx2
from fastapi import HTTPException, status
from config import config

class AuthForwardingService:
    async def process_login(self, body: dict) -> dict:

        async with httpx2.AsyncClient() as client:

            try:
                auth_response = await client.post(
                    f"{config.AUTH_SERVICE_URL}/auth/login",
                    json=body,
                    timeout=5.0
                )

                auth_response.raise_for_status()

                auth_data = auth_response.json()
            except httpx2.HTTPStatusError as exc:
                raise HTTPException (
                    status_code=exc.response.status_code,
                    detail=exc.response.json().get("detail", "Error")
                )

            except httpx2.RequestError:
                raise HTTPException (
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Auth Service is disconnected"
                )

            customer_id = auth_data["data"]["customer_id"]

            try:
                customer_response = await client.get(f"{config.CUSTOMER_SERVICE_URL}/customers/{customer_id}",
                                                     timeout=5.0)

                customer_response.raise_for_status()
                customer_data = customer_response.json()
            except httpx2.HTTPStatusError as exc:
                raise HTTPException (
                    status_code=exc.response.status_code,
                    detail=exc.response.json().get("detail", f"not found customer with {customer_id}")
                )
            except httpx2.RequestError:
                raise HTTPException (
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Customer Service is disconnected"
                )
    
            merge_data = {
                **auth_data["data"],
                **customer_data["data"]
            }

            return {
                "status": "success",
                "message": "Login successful",
                "data": merge_data
            }
        
    async def process_refresh(self, refresh_token: str) -> dict:
        async with httpx2.AsyncClient() as client:
            try:
                auth_response = await client.put(
                    f"{config.AUTH_SERVICE_URL}/auth/refresh",
                    cookies={"refresh_token": refresh_token},
                    timeout=5.0
                )
                auth_response.raise_for_status()
                return auth_response.json()
                
            except httpx2.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=exc.response.status_code,
                    detail=exc.response.json().get("detail", "Invalid refresh token")
                )
            except httpx2.RequestError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Auth Service is disconnected"
                )       
def get_auth_forwarding_service() -> AuthForwardingService:
    return AuthForwardingService()