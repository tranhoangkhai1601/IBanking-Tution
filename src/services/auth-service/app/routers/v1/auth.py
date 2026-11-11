
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from databases.schema.user import UserInLogin
from databases.database import get_session
from databases.models import auth_credentials

authRouter = APIRouter()

@authRouter.post("/login")
async def login(userInfo: UserInLogin,
                session: AsyncSession = Depends(get_session)):
    if (userInfo.data == 1):
        stmt = select(auth_credentials).where(auth_credentials.email == userInfo.username)
    else:
        stmt = select(auth_credentials).where(auth_credentials.phone == userInfo.username)
        
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if (not user):
        raise HTTPException (
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username or password is not correct",
        )

    is_password_correct = bcrypt.checkpw(
        userInfo.password.encode('utf-8'),
        str(user.password).encode('utf-8')
    )

    if not is_password_correct:
        raise HTTPException (
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username or password is not correct",
        )

    return {
        "status": "success",
        "message": "Login successful",
        "data": {
            "customer_id": str(user.customer_id),
            "role_id": user.role_id,
            "email": user.email,
            "phone": user.phone
        }
    }
    
