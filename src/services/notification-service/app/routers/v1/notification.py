from fastapi import APIRouter, HTTPException

from schemas.notification_schema import (
    EmailRequest,
    EmailResponse,
    PaymentSuccessRequest,
    OTPRequest
)
from services.notification_service import send_email, send_payment_success_email, send_otp_email

router = APIRouter(prefix="/v1/notifications", tags=["Notifications"])


@router.post("/email", response_model=EmailResponse)
def create_email_notification(request: EmailRequest) -> EmailResponse:
    try:
        send_email(request)
    except OSError as exc:
        raise HTTPException(status_code=502, detail="Can not send by SMTP") from exc

    return EmailResponse(message="Already send!")


@router.post("/payment-success", response_model=EmailResponse)
def create_payment_success_notification(request: PaymentSuccessRequest) -> EmailResponse:
    try:
        send_payment_success_email(request)
    except OSError as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to send email via SMTP",
        ) from exc

    return EmailResponse(message="Payment confirmation email sent")

@router.post("/otp", response_model=EmailResponse)
def create_otp_notification(request: OTPRequest) -> EmailResponse:
    try:
        send_otp_email(request)
    except OSError as exc:
        raise HTTPException(
            status_code=502,
            detail="Không gửi được email OTP qua SMTP",
        ) from exc

    return EmailResponse(message="Đã gửi email OTP")