
from fastapi import APIRouter, status, HTTPException, Depends
from services.customer_service import CustomerService, get_customer_service

customerRouter = APIRouter(prefix="/customers", tags=["Customers Core"])

@customerRouter.get("/{customer_id}")
async def get_customer(customer_id: str,
                       customer_service: CustomerService = Depends(get_customer_service)):
    
    customer = await customer_service.get_customer(customer_id)

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Not found customer with {customer_id}"
        )

    account_data = await customer_service.get_accounts(customer_id)

    return {
        "status": "success",
        "message": "Get customer info successful",
        "data": {
            "customer_id": str(customer.customer_id),
            "email": customer.email,
            "phone": customer.phone,
            "full_name": customer.full_name,
            "status": customer.status,
            "language": customer.language,
            "accounts": account_data
        }
    }