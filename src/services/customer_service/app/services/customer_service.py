
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from databases.database import get_session
from databases.models import AccountType, customer_details, customers

class CustomerService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_customer(self, customer_id: str):
        stmt = select(customers).where(customers.customer_id == customer_id)

        result = await self.session.execute(stmt)

        customer = result.scalar_one_or_none()

        if not customer:
            return None

        return customer

    async def get_accounts(self, customer_id: str):
        stmt = select(customer_details).where(customer_details.customer_id == customer_id)

        result = await self.session.execute(stmt)

        accounts = result.scalars().all()

        if not accounts:
            return []

        accounts_data = []

        for acc in accounts:
            accounts_data.append({
                "account_id": str(acc.account_id),
                "account_num": acc.account_num,
                "account_type": AccountType(acc.account_type).name.lower(),
                "account_open_date": acc.account_open_date.date().isoformat(),
                "balance": acc.balance,
                "account_active": acc.account_active,
                "description": acc.description
            })
        return accounts_data

def get_customer_service(session: AsyncSession = Depends(get_session)) -> CustomerService:
    return CustomerService(session)