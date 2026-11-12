
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from databases.schema.user import UserInLogin
from services.auth_service import AuthService, get_auth_service

authRouter = APIRouter(prefix="/auth", tags=["Auth Core"])

@authRouter.post("/login")
async def login(userInfo: UserInLogin,
                auth_service: AuthService = Depends(get_auth_service)):

    user = await auth_service.authenticate_user(userInfo)

    if not user:
        raise HTTPException (
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username or password is not correct"
        )

    return {
        "status": "success",
        "message": "Login successful",
        "data": {
            "customer_id": str(user.customer_id),
            "role_id": user.role_id    
        }
    }