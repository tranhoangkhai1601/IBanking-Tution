
from decimal import Decimal
import uuid
from pydantic import BaseModel, ConfigDict, field_validator
from typing import List
from databases.models import AccountType, LanguageType

class AccountOut(BaseModel):
    account_num: str
    account_type: str
    balance: Decimal
    account_active: bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator('account_type', mode='before')
    @classmethod
    def format_account_type(cls, value):
        if isinstance(value, AccountType):
            return value.name 
        if isinstance(value, int):
            return AccountType(value).name 
        return str(value)

class CustomerOut(BaseModel):
    customer_id: uuid.UUID
    email: str
    phone: str
    full_name: str
    language: str

    accounts: List[AccountOut] = []

    @field_validator('language', mode='before')
    @classmethod
    def format_language_type(cls, value):
        if isinstance(value, LanguageType):
            return value.name
        if isinstance(value, int):
            return LanguageType(value).name
        return str(value)

    model_config = ConfigDict(from_attributes=True)

class CustomerResponse(BaseModel):
    status: str
    message: str
    data: CustomerOut