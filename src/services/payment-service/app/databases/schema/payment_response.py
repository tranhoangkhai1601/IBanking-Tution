from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TuitionPaymentRequest(BaseModel):
    account_id: UUID
    student_id: str
    tuition_id: UUID
    description: str | None = Field(default=None, max_length=500)


class TuitionPaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: UUID
    account_id: UUID
    tuition_id: UUID | None
    amount: Decimal
    status: str
    requires_otp: bool = False


class OTPVerificationRequest(BaseModel):
    otp_code: str = Field(pattern=r"^[0-9]{6}$")


class TuitionPaymentDetails(BaseModel):
    tuition_id: UUID
    merchant_account_id: UUID
    student_name: str
    amount: Decimal
    status: str