
from datetime import datetime, timedelta, timezone
from random import randint
import uuid_utils as uuid
from decimal import Decimal
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from databases.models import statusType, MerchantType, students, tuition
from config import config

first = ["Nguyễn", "Trần", "Võ", "Lê", "Đinh", "Vũ", "Dương"]
middle = ["Hoàng", "Ngọc", "Hùng", "Gia", "Hoài", "Thảo"]
last = ["Khải", "Phi", "Hoa", "Thịnh", "Phúc", "Nhi"]

async def seed_tuition_data(session: AsyncSession):
    students_data = []
    for i in range (20):
        students_data.append({
            "merchant_code": MerchantType.TDTU,
            "student_id": "524K" + str(randint(100, 1000)),
            "full_name": first[randint(0,len(first) - 1)] + " " + middle[randint(0, len(middle) - 1)] + " " + last[randint(0, len(last) - 1)]
        })

    stmt = insert(students).values(students_data)

    conn = stmt.on_conflict_do_nothing(index_elements=["merchant_code",'student_id'])

    await session.execute(conn)
    await session.flush()

    time = datetime.now(timezone.utc)

    expire = time + timedelta(days=5)

    tuition_data = []
    for i in range (20):
        tuition_data.append({
            "tuition_id": uuid.uuid7(),
            "student_id": students_data[i]["student_id"],
            "merchant_code": MerchantType.TDTU,
            "merchant_account_id": config.MERCHANT,
            "amount": Decimal(11_000_000),
            "semester": 1,
            "academic_year": 2026,
            "status": statusType.UNPAID,
            "expires_at": expire,
            "create_at": time,
            "update_at": time
        })

    stmt = insert(tuition).values(tuition_data)

    await session.execute(stmt)
    await session.flush()