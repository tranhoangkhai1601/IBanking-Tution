
import httpx2
from fastapi import HTTPException, status
from config import config

class CustomerService:
    async def get_profile(self, customer_id):
        async with httpx2.AsyncClient() as client:
            try:
                customer_response = await client.get(f"{config.CUSTOMER_SERVICE_URL}/customers/{customer_id}",
                                             timeout=5.0)
                customer_response.raise_for_status()

                return customer_response.json()
                
            except httpx2.HTTPStatusError as exc:
                raise HTTPException (
                    status_code=exc.response.status_code,
                    detail=exc.response.json().get("detail", f"not found customer with {customer_id}")
                )

            except httpx2.RequestError:
                raise HTTPException (
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Customer service is disconnected"
                )

    async def get_transaction_history(self, customer_id):
        async with httpx2.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{config.CUSTOMER_SERVICE_URL.rstrip('/')}/customers/"
                    f"{customer_id}/transactions",
                    timeout=5.0,
                )
                response.raise_for_status()
                return response.json()
            except httpx2.HTTPStatusError as exc:
                try:
                    detail = exc.response.json().get(
                        "detail",
                        "Unable to load transaction history",
                    )
                except ValueError:
                    detail = "Unable to load transaction history"
                raise HTTPException(
                    status_code=exc.response.status_code,
                    detail=detail,
                ) from exc
            except httpx2.RequestError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Customer service is disconnected",
                ) from exc

def get_customer_service() -> CustomerService:
    return CustomerService()
