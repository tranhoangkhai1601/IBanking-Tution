
import json
from uuid import UUID
from decimal import Decimal
from fastapi import Depends
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
from databases.database import get_session, get_redis
from databases.models import students, tuition, statusType
from fastapi import HTTPException, status as http_status

class TuitionService:
    def __init__(self, session: AsyncSession, redis: redis.Redis):
        self.session = session
        self.redis = redis
    
    async def get_tuition_by_stdid(self, student_id: str):
        cache_key = f"tuition:student:{student_id.upper()}"

        cached_value = await self.redis.get(cache_key)

        if cached_value:
            print("Cache hit")
            return json.loads(cached_value)

        stmt = select(students).where(students.student_id == student_id.upper())
        result = await self.session.execute(stmt)
        student_data  = result.scalar_one_or_none()

        if not student_data:
            return None

        stmt = select(tuition).where(tuition.student_id == student_id.upper(),
                                     tuition.status == statusType.UNPAID)

        result = await self.session.execute(stmt)
        tuition_data = result.scalars().all()

        tuition_list = []
        tuition_amount = Decimal('0.00')

        for item in tuition_data:
            tuition_list.append({
                "tuition_id": str(item.tuition_id),
                "semester": item.semester,
                "amount": str(item.amount),
                "status": statusType(item.status).name
            })
            tuition_amount += item.amount

        response_data = {
            "student_id": student_data.student_id,
            "name": student_data.full_name,
            "total_unpaid": str(tuition_amount),
            "details": tuition_list
        }

        await self.redis.setex(
            name=cache_key,
            time=1800,
            value=json.dumps(response_data)
        )

        return response_data

    async def get_tuition_for_payment(self, tuition_id: UUID, student_id: str):
        stmt = (
            select(tuition, students.full_name)
            .join(
                students,
                and_(
                    tuition.student_id == students.student_id,
                    tuition.merchant_code == students.merchant_code,
                ),
            )
            .where(
                tuition.tuition_id == tuition_id,
                tuition.student_id == student_id.upper(),
            )
        )
        result = await self.session.execute(stmt)
        row = result.one_or_none()

        if row is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Tuition was not found for this student",
            )
        tuition_data, student_name = row
        if tuition_data.status != statusType.UNPAID:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="Tuition is not available for payment",
            )

        return {
            "tuition_id": str(tuition_data.tuition_id),
            "merchant_account_id": str(tuition_data.merchant_account_id),
            "student_name": student_name,
            "amount": str(tuition_data.amount),
            "status": statusType(tuition_data.status).name,
        }

    async def get_tuition_history_details(self, tuition_ids: list[UUID]):
        stmt = (
            select(
                tuition.tuition_id,
                tuition.merchant_account_id,
                students.full_name,
            )
            .join(
                students,
                and_(
                    tuition.student_id == students.student_id,
                    tuition.merchant_code == students.merchant_code,
                ),
            )
            .where(tuition.tuition_id.in_(tuition_ids))
        )
        result = await self.session.execute(stmt)
        return [
            {
                "tuition_id": str(tuition_id),
                "merchant_account_id": str(merchant_account_id),
                "student_name": student_name,
            }
            for tuition_id, merchant_account_id, student_name in result.all()
        ]


def get_tuition_service(
        session: AsyncSession = Depends(get_session),
        redis_client: redis.Redis = Depends(get_redis)
) -> TuitionService:
    return TuitionService(session, redis_client)