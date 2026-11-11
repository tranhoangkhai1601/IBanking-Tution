
from fastapi import APIRouter, status, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from databases.database import get_session
from databases.models import AccountType, customer_details, customers

customerRouter = APIRouter(prefix="/customers", tags=["Customers Core"])

@customerRouter.get("/{customer_id}")
async def get_customer(customer_id: str,
                       session: AsyncSession = Depends(get_session)):
    stmt_customer = select(customers).where(customers.customer_id == customer_id)

    result_customer = await session.execute(stmt_customer)
    customer = result_customer.scalar_one_or_none()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Not found customer with {customer_id}"
        )

    stmt_account = select(customer_details).where(customer_details.customer_id == customer_id)
    result_account = await session.execute(stmt_account)
    accounts = result_account.scalars().all()

    account_data = []
    for acc in accounts:
        account_data.append({
            "account_id": str(acc.account_id),
            "account_num": acc.account_num,
            "account_type": AccountType(acc.account_type).name.lower(),
            "account_open_date": acc.account_open_date.date().isoformat(),
            "balance": acc.balance,
            "account_active": acc.account_active,
            "description": acc.description
        })

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