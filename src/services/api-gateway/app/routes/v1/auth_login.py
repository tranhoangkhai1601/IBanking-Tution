
from fastapi import APIRouter, HTTPException, status, Request, Depends
from services.auth_forwarding import AuthForwardingService, get_auth_forwarding_service

auth_router = APIRouter(prefix="/api/v1", tags=["Auth Forwarding"])

@auth_router.post("/auth/login")
async def forward_login_to_auth_service(request: Request,
                                        service: AuthForwardingService = Depends(get_auth_forwarding_service)):

    body = await request.json()

    response = await service.process_login(body)

    return response