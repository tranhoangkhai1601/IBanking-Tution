
from fastapi import APIRouter
from databases.schema.user import UserInLogin

authRouter = APIRouter(prefix="/v1")

@authRouter.post("/login")
def login(userInfo: UserInLogin):
    return {"data": userInfo}
