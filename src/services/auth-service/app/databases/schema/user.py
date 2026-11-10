from pydantic import BaseModel

class UserInLogin(BaseModel):
    username: str
    password: str