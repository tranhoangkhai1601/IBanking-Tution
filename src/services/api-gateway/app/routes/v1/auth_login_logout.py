
from fastapi import APIRouter, HTTPException, status, Request, Depends, Response, Cookie
from services.auth_forwarding import AuthForwardingService, get_auth_forwarding_service
from config import config
from databases.schema.user import UserPayload

auth_router = APIRouter(prefix="/api/v1", tags=["Auth Forwarding"])

@auth_router.post("/auth/login")
async def forward_login_to_auth_service(request: Request,
                                        response: Response,
                                        service: AuthForwardingService = Depends(get_auth_forwarding_service)):

    body = await request.json()

    merge_data = await service.process_login(body)

    access_token = merge_data["data"].pop("access_token")
    refresh_token = merge_data["data"].pop("refresh_token")
    merge_data["data"].pop("token_type", None)

    is_secure = config.SERVER_ENV == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        path="/api/v1/auth/refresh"
    )

    return merge_data

@auth_router.post("/auth/refresh")
async def get_refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    service: AuthForwardingService = Depends(get_auth_forwarding_service)
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is required"
        )

    new_data = await service.process_refresh(refresh_token)
    new_access_token = new_data["data"]["access_token"]

    is_secure = config.SERVER_ENV == "production"
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return {"status": "success", "message": "Token refreshed successfully"}

@auth_router.delete("/auth/logout")
async def logout(response: Response):
    is_secure = config.SERVER_ENV == "production"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/api/v1/auth/refresh",
    )
    return {"status": "success", "message": "Logout successful"}