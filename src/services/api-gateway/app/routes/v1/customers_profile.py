
from fastapi import APIRouter, Depends, Response
from databases.schema.user import UserPayload
from middlewares.auth_middleware import verify_access_token
from services.customer_service import CustomerService, get_customer_service

customerRouter = APIRouter(prefix="/api/v1", tags=["Customers Forwarding"])

@customerRouter.get("/customers/me")
async def forward_get_profile(
    user_payload: UserPayload = Depends(verify_access_token),
    service: CustomerService = Depends(get_customer_service),
):
    return await service.get_profile(user_payload.customer_id)


@customerRouter.get("/customers/me/transactions")
async def forward_get_transaction_history(
    response: Response,
    user_payload: UserPayload = Depends(verify_access_token),
    service: CustomerService = Depends(get_customer_service),
):
    response.headers["Cache-Control"] = "no-store"
    return await service.get_transaction_history(user_payload.customer_id)