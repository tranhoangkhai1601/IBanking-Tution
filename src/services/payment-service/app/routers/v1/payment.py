
import uuid

from fastapi import APIRouter, Depends, Header, status
from databases.models import StatusType, Transactions
from databases.schema.payment_response import (
    OTPVerificationRequest,
    TuitionPaymentRequest,
    TuitionPaymentResponse,
)
from services.payment_service import PaymentService, get_payment_service

payment_router = APIRouter(prefix="/payment", tags=["Payment Core"])


def _payment_response(transaction: Transactions) -> TuitionPaymentResponse:
    return TuitionPaymentResponse(
        transaction_id=transaction.transaction_id,
        account_id=transaction.account_id,
        tuition_id=transaction.tuition_id,
        amount=transaction.amount,
        status=StatusType(transaction.status).name,
        requires_otp=(transaction.extra_data or {}).get("payment_stage")
        in {"OTP_PENDING", "OTP_VERIFIED"},
    )


@payment_router.post(
    "/tuition",
    response_model=TuitionPaymentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_tuition_payment(
    request: TuitionPaymentRequest,
    customer_id: uuid.UUID = Header(alias="X-Authenticated-Customer-ID"),
    customer_email: str = Header(alias="X-Authenticated-Customer-Email"),
    idempotency_key: str = Header(
        alias="Idempotency-Key",
        min_length=1,
        max_length=255,
    ),
    service: PaymentService = Depends(get_payment_service),
):
    description = (
        request.description.strip()
        if request.description and request.description.strip()
        else f"Tuition payment for {request.student_id.upper()}"
    )
    existing = await service.find_idempotent_tuition_payment(
        customer_id=customer_id,
        account_id=request.account_id,
        tuition_id=request.tuition_id,
        description=description,
        idempotency_key=idempotency_key,
    )
    if existing is not None:
        await service.send_payment_otp(existing.transaction_id)
        return _payment_response(existing)

    tuition_details = await service.get_tuition_payment_details(
        request.tuition_id,
        request.student_id,
    )
    transaction = await service.process_payment(
        customer_id=customer_id,
        account_id=request.account_id,
        customer_email=str(customer_email),
        student_id=request.student_id,
        tuition_id=tuition_details.tuition_id,
        amount=tuition_details.amount,
        idempotency_key=idempotency_key,
        merchant_account_id=tuition_details.merchant_account_id,
        student_name=tuition_details.student_name,
        description=description,
    )
    await service.send_payment_otp(transaction.transaction_id)
    return _payment_response(transaction)


@payment_router.post(
    "/{transaction_id}/verify-otp",
    response_model=TuitionPaymentResponse,
)
async def verify_tuition_payment_otp(
    transaction_id: uuid.UUID,
    request: OTPVerificationRequest,
    customer_id: uuid.UUID = Header(alias="X-Authenticated-Customer-ID"),
    service: PaymentService = Depends(get_payment_service),
):
    transaction = await service.verify_payment_otp(
        transaction_id,
        request.otp_code,
        customer_id=customer_id,
    )
    return _payment_response(transaction)


@payment_router.get(
    "/{transaction_id}",
    response_model=TuitionPaymentResponse,
)
async def get_payment_status(
    transaction_id: uuid.UUID,
    customer_id: uuid.UUID = Header(alias="X-Authenticated-Customer-ID"),
    service: PaymentService = Depends(get_payment_service),
):
    transaction = await service.get_payment_status(
        transaction_id,
        customer_id=customer_id,
    )
    return _payment_response(transaction)
