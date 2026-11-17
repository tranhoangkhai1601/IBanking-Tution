
import uuid
import json
from datetime import datetime
from uuid import UUID
import httpx2
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from config import config
from databases.database import get_session, get_redis
from databases.models import (
    AccountType,
    EntryTypeEnum,
    customer_details,
    customers,
    transaction_lines,
)
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

    async def get_transaction_history(self, customer_id: str):
        cache_key = f"customer:transaction_history:v6:{customer_id}"
        cached_value = await self.redis.get(cache_key)
        if cached_value is not None:
            return json.loads(cached_value)

        stmt = (
            select(transaction_lines, customer_details.account_num)
            .join(
                customer_details,
                transaction_lines.account_id == customer_details.account_id,
            )
            .where(customer_details.customer_id == customer_id)
            .order_by(
                transaction_lines.create_at.desc(),
                transaction_lines.entry_id.desc(),
            )
            .limit(100)
        )
        result = await self.session.execute(stmt)

        history = []
        for line, account_num in result.all():
            extra_data = line.extra_data or {}
            is_debit = line.entry_type == EntryTypeEnum.OUT
            payer_account_id = (
                str(line.account_id)
                if is_debit
                else extra_data.get("payer_account_id")
            )
            payer_customer_id = (
                customer_id
                if is_debit
                else extra_data.get("payer_customer_id")
            )
            amount = -line.amount if is_debit else line.amount
            history.append({
                "transaction_id": str(line.transaction_id),
                "date": line.create_at.strftime("%d/%m/%Y"),
                "amount": str(amount),
                "status": "Success",
                "tuition_id": extra_data.get("tuition_id"),
                "merchantAccountId": (
                    extra_data.get("merchant_account_id")
                    if is_debit
                    else str(line.account_id)
                ),
                "studentName": extra_data.get("student_name"),
                "description": line.description,
                "payerKey": payer_customer_id,
                "paymentAccountKey": payer_account_id,
                "paymentAccount": (
                    {"account_num": account_num} if is_debit else None
                ),
            })

        missing_tuition_ids = list(dict.fromkeys(
            item["tuition_id"]
            for item in history
            if item.get("tuition_id")
            and (
                not item.get("merchantAccountId")
                or not item.get("studentName")
            )
        ))
        if missing_tuition_ids:
            try:
                async with httpx2.AsyncClient(timeout=5.0) as client:
                    response = await client.get(
                        f"{config.TUITION_SERVICE_URL.rstrip('/')}/tuition/history-details",
                        params=[("tuition_ids", tuition_id) for tuition_id in missing_tuition_ids],
                    )
                    response.raise_for_status()
                    details = response.json()
            except httpx2.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Tuition service could not provide transaction details",
                ) from exc
            except httpx2.RequestError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Tuition service is unavailable",
                ) from exc
            if not isinstance(details, list):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Tuition service returned invalid transaction details",
                )
            details_by_id = {
                item["tuition_id"]: item
                for item in details
                if isinstance(item, dict) and isinstance(item.get("tuition_id"), str)
            }
            for item in history:
                tuition_details = details_by_id.get(item.get("tuition_id"))
                if tuition_details is not None:
                    item["merchantAccountId"] = tuition_details.get(
                        "merchant_account_id"
                    )
                    item["studentName"] = item.get("studentName") or (
                        tuition_details.get("student_name")
                    )

        account_ids_to_resolve = {
            UUID(account_id)
            for item in history
            for account_id in (
                item.get("paymentAccountKey"),
                item.get("merchantAccountId"),
            )
            if account_id
        }
        account_numbers = {}
        if account_ids_to_resolve:
            account_rows = await self.session.execute(
                select(customer_details.account_id, customer_details.account_num).where(
                    customer_details.account_id.in_(account_ids_to_resolve)
                )
            )
            account_numbers = {
                str(account_id): account_num
                for account_id, account_num in account_rows.all()
            }
        for item in history:
            payer_account_id = item.get("paymentAccountKey")
            item["paymentAccount"] = (
                {"account_num": account_numbers[payer_account_id]}
                if payer_account_id in account_numbers
                else None
            )
            merchant_account_id = item.get("merchantAccountId")
            item["merchantAccountNumber"] = (
                account_numbers.get(merchant_account_id)
                if merchant_account_id
                else None
            )

        await self.redis.setex(
            name=cache_key,
            time=300,
            value=json.dumps(history),
        )
        return history

def get_customer_service(session: AsyncSession = Depends(get_session),
                         redis_client: redis.Redis = Depends(get_redis)) -> CustomerService:
    return CustomerService(session, redis_client)