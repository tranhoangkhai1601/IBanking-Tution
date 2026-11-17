from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse

from databases.schema.user import UserPayload
from middlewares.auth_middleware import verify_access_token
from services.customer_service import CustomerService, get_customer_service
from services.payment_forwarding import (
    PaymentForwardingService,
    get_payment_forwarding_service,
)


payment_router = APIRouter(prefix="/api/v1", tags=["Payment Forwarding"])


@payment_router.post("/payments/tuition")
async def forward_tuition_payment(
    body: dict,
    idempotency_key: str = Header(
        alias="Idempotency-Key",
        min_length=1,
        max_length=255,
    ),
    user_payload: UserPayload = Depends(verify_access_token),
    customer_service: CustomerService = Depends(get_customer_service),
    service: PaymentForwardingService = Depends(get_payment_forwarding_service),
):
    profile = await customer_service.get_profile(user_payload.customer_id)
    customer_email = profile.get("data", {}).get("email")
    if not customer_email:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Customer profile does not include an email address",
        )
    response_body, response_status = await service.create_tuition_payment(
        body,
        customer_id=user_payload.customer_id,
        customer_email=customer_email,
        idempotency_key=idempotency_key,
    )
    return JSONResponse(content=response_body, status_code=response_status)


@payment_router.post("/payments/{transaction_id}/verify-otp")
async def forward_payment_otp_verification(
    transaction_id: UUID,
    body: dict,
    user_payload: UserPayload = Depends(verify_access_token),
    service: PaymentForwardingService = Depends(get_payment_forwarding_service),
):
    response_body, response_status = await service.verify_payment_otp(
        str(transaction_id),
        body,
        customer_id=user_payload.customer_id,
    )
    return JSONResponse(content=response_body, status_code=response_status)


@payment_router.get("/payments/{transaction_id}")
async def forward_payment_status(
    transaction_id: UUID,
    user_payload: UserPayload = Depends(verify_access_token),
    service: PaymentForwardingService = Depends(get_payment_forwarding_service),
):
    response_body, response_status = await service.get_payment_status(
        str(transaction_id),
        customer_id=user_payload.customer_id,
    )
    return JSONResponse(content=response_body, status_code=response_status)
