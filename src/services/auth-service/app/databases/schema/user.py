from pydantic import BaseModel

class UserInLogin(BaseModel):
    username: str
    password: str
    data: int

class UserPayload(BaseModel):
    customer_id: str
    role_id: int