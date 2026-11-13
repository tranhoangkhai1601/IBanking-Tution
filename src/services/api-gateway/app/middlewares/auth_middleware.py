
import jwt
from fastapi import Cookie, HTTPException, status
from pydantic import ValidationError

from config import config
from databases.schema.user import UserPayload


async def verify_access_token(
    access_token: str | None = Cookie(default=None),
) -> UserPayload:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is required"
        )

    try:
        payload = jwt.decode(
            access_token,
            config.JWT_TOKEN,
            algorithms=[config.JWT_ALGORITHM]
        )
        return UserPayload.model_validate(payload)
    except (jwt.InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        ) from None
