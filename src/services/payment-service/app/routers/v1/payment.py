
from fastapi import APIRouter, HTTPException, status, Depends

payment_router = APIRouter(prefix="/payment", tags=["Payment Core"])
@payment_router.g
