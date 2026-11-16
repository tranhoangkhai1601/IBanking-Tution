
from decimal import Decimal
import uuid_utils as uuid
from pydantic import BaseModel, ConfigDict
from typing import List

class AccountOut(BaseModel):
    account_num: str
    account_type: int
    balance: Decimal
    account_active: bool

    model_config = ConfigDict(from_attributes=True)

class CustomerOut(BaseModel):
    customer_id: uuid.UUID
    email: str
    phone: str
    full_name: str
    language: int

    accounts: List[AccountOut] = []

    model_config = ConfigDict(from_attributes=True)

class CustomerResponse(BaseModel):
    status: str
    message: str
    data: CustomerOut