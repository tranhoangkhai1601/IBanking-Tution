
from fastapi import APIRouter, status, HTTPException, Depends
from services.customer_service import CustomerService, get_customer_service
from databases.schema.customer import CustomerResponse

customerRouter = APIRouter(prefix="/customers", tags=["Customers Core"])

@customerRouter.get("/{customer_id}", response_model=CustomerResponse)
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
            **customer,
            "accounts": account_data
        }
    }