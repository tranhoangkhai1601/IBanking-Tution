from pydantic import BaseModel, EmailStr, Field, AwareDatetime
from uuid import UUID
from decimal import Decimal

class EmailRequest(BaseModel):
    recipient: EmailStr
    subject: str = Field(min_length=1)
    content: str = Field(min_length=1)

class PaymentSuccessRequest(BaseModel):
    recipient: EmailStr
    transaction_id: UUID
    tuition_id: UUID
    amount: Decimal = Field(gt=0, max_digits=19, decimal_places=4)
    paid_at: AwareDatetime # Cái này phải gửi kèm cả thông tin múi giờ khác với Datetime

class OTPRequest(BaseModel):
    recipient: EmailStr
    otp_code: str = Field(pattern=r"^[0-9]{6}$")
    expires_at: AwareDatetime

class EmailResponse(BaseModel):
    message: str

