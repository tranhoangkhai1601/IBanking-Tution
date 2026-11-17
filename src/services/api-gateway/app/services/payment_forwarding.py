import httpx2
from fastapi import HTTPException, status

from config import config


class PaymentForwardingService:
    async def create_tuition_payment(
        self,
        body: dict,
        *,
        customer_id: str,
        customer_email: str,
        idempotency_key: str,
    ) -> tuple[dict, int]:
        try:
            async with httpx2.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{config.PAYMENT_SERVICE_URL.rstrip('/')}/payment/tuition",
                    json=body,
                    headers={
                        "Idempotency-Key": idempotency_key,
                        "X-Authenticated-Customer-ID": customer_id,
                        "X-Authenticated-Customer-Email": customer_email,
                    },
                )
                response.raise_for_status()
                return response.json(), response.status_code
        except httpx2.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("detail", "Payment request failed")
            except ValueError:
                detail = "Payment request failed"
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=detail,
            ) from exc
        except httpx2.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment service is unavailable",
            ) from exc

    async def verify_payment_otp(
        self,
        transaction_id: str,
        body: dict,
        *,
        customer_id: str,
    ) -> tuple[dict, int]:
        try:
            async with httpx2.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{config.PAYMENT_SERVICE_URL.rstrip('/')}/payment/"
                    f"{transaction_id}/verify-otp",
                    json=body,
                    headers={"X-Authenticated-Customer-ID": customer_id},
                )
                response.raise_for_status()
                return response.json(), response.status_code
        except httpx2.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get(
                    "detail",
                    "OTP verification failed",
                )
            except ValueError:
                detail = "OTP verification failed"
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=detail,
            ) from exc
        except httpx2.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment service is unavailable",
            ) from exc

    async def get_payment_status(
        self,
        transaction_id: str,
        *,
        customer_id: str,
    ) -> tuple[dict, int]:
        try:
            async with httpx2.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{config.PAYMENT_SERVICE_URL.rstrip('/')}/payment/{transaction_id}",
                    headers={"X-Authenticated-Customer-ID": customer_id},
                )
                response.raise_for_status()
                return response.json(), response.status_code
        except httpx2.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("detail", "Payment request failed")
            except ValueError:
                detail = "Payment request failed"
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=detail,
            ) from exc
        except httpx2.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment service is unavailable",
            ) from exc


def get_payment_forwarding_service() -> PaymentForwardingService:
    return PaymentForwardingService()
