
from pydantic import BaseModel

class UserPayload(BaseModel):
    customer_id: str
    role_id: int