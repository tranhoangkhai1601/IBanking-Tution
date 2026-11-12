
from fastapi import APIRouter, HTTPException, status, Request, Depends, Response
from services.auth_forwarding import AuthForwardingService, get_auth_forwarding_service
from config import config

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