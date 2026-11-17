
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from databases.models import matrix_permission

async def load_permission(session: AsyncSession, redis: Redis):

    stmt = select(matrix_permission)
    result = await session.execute(stmt)

    permission =result.scalars().all()

    if not permission:
        print("Matrix permission is empty!!")
        return

    unique_role = {row.role_id for row in permission}

    async with redis.pipeline(transaction=True) as pipe:
        for role_id in unique_role:
            redis_key = f"auth:role:{role_id}:permission"
            pipe.delete(redis_key)
        
        for row in permission:
            redis_key = f"auth:role:{row.role_id}:permission"
            pipe.hset(redis_key, str(row.feature_id), str(row.permission))

        await pipe.execute()