
import uuid
import json
from datetime import datetime
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from databases.database import get_session, get_redis
from databases.models import AccountType, customer_details, customers
import redis.asyncio as redis

class CustomerService:
    def __init__(self, session: AsyncSession, redis: redis.Redis):
        self.session = session
        self.redis = redis

    async def get_customer(self, customer_id: str):
        cache_key = f"customer:info:{customer_id}"

        cached_value = await self.redis.get(cache_key)
        if cached_value:
            print("Cache value")
            return json.loads(cached_value)

        stmt = select(customers).where(customers.customer_id == customer_id)

        result = await self.session.execute(stmt)

        customer = result.scalar_one_or_none()

        if not customer:
            return None

        customer_dict = {}
        for column in customer.__table__.columns:
            value = getattr(customer, column.name)
            if isinstance(value, uuid.UUID):
                customer_dict[column.name] = str(value)
            elif isinstance(value, datetime):
                customer_dict[column.name] = value.isoformat()
            elif hasattr(value, "name"):
                customer_dict[column.name] = value.name
            else:
                customer_dict[column.name] = value

        await self.redis.setex(
            name=cache_key,
            time=3600,
            value=json.dumps(customer_dict)
        )

        return customer_dict

    async def get_accounts(self, customer_id: str):
        cache_key = f"customer:account:{customer_id}"

        cached_value = await self.redis.get(cache_key)
        if cached_value:
            print("Cache value")
            return json.loads(cached_value)

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
                "balance": float(acc.balance),
                "account_active": acc.account_active,
                "description": acc.description
            })

        await self.redis.setex(
            name=cache_key,
            time=3600,
            value=json.dumps(accounts_data)
        )
        return accounts_data

def get_customer_service(session: AsyncSession = Depends(get_session),
                         redis_client: redis.Redis = Depends(get_redis)) -> CustomerService:
    return CustomerService(session, redis_client)