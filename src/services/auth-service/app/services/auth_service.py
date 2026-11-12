
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends
from databases.models import auth_credentials
from databases.schema.user import UserInLogin, UserPayload
from config import config
from databases.database import get_session
from providers import JwtProvider

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

        self.access_token_provider = JwtProvider(
            secret_signature=config.JWT_TOKEN,
            token_life=config.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        self.refresh_token_provider = JwtProvider(
            secret_signature=config.JWT_REFRESH_TOKEN,
            token_life=config.REFRESH_TOKEN_EXPIRE_MINUTES
        )

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

    def create_tokens(self, user) -> dict:
        payload = UserPayload(
            customer_id=str(user.customer_id),
            role_id=user.role_id
        )

        access_token = self.access_token_provider.generate_token(payload)
        refresh_token = self.refresh_token_provider.generate_token(payload)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }

def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)