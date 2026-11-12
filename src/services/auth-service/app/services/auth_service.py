
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from databases.models import auth_credentials
from databases.schema.user import UserInLogin
from fastapi import Depends
from databases.database import get_session

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def authenticate_user(self, userInfo: UserInLogin):
        if userInfo.data == 1:
            stmt = select(auth_credentials).where(auth_credentials.email == userInfo.username)
        else:
            stmt = select(auth_credentials).where(auth_credentials.phone == userInfo.username)
        
        result = await self.session.execute(stmt)

        user = result.scalar_one_or_none()

        if not user:
            return None

        is_password_correct = bcrypt.checkpw(
            userInfo.password.encode('utf-8'),
            str(user.password).encode('utf-8')
        )

        if not is_password_correct:
            return None

        return user

def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)