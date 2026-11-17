
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status, Cookie
from databases.schema.user import UserInLogin, UserPayload
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
    
    token = await auth_service.create_tokens(user)

    return {
        "status": "success",
        "message": "Login successful",
        "data": {
            "customer_id": str(user.customer_id),
            "role_id": user.role_id,
            "access_token": token["access_token"],
            "refresh_token": token["refresh_token"],
            "token_type": "Bearer"
        }
    }

@authRouter.put("/refresh")
async def refresh_token(
    refresh_token: str = Cookie(...),
    auth_service: AuthService = Depends(get_auth_service)
):
    payload_data = await auth_service.decode_refresh_token(refresh_token)

    if not payload_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid or expired refresh token"
        )

    new_access_token = await auth_service.create_access_token(payload_data)

    return {
        "status": "success",
        "data": {
            "access_token": new_access_token
        }
    }