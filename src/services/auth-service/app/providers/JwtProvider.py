
import jwt
from datetime import datetime, timezone, timedelta
from config import config
from databases.schema.user import UserPayload

class JwtProvider:
    def __init__(self, secret_signature: str, token_life: int):
        
        self.secret_signature = secret_signature
        self.token_life = token_life
        self.algorithm = config.JWT_ALGORITHM

    async def generate_token(self, userInfo: UserPayload):
        to_encode = userInfo.model_dump()

        expire = datetime.now(timezone.utc) + timedelta(minutes=self.token_life)
        to_encode.update({"exp": expire})

        return jwt.encode(
            to_encode,
            self.secret_signature,
            algorithm=self.algorithm
        )

    async def verify_token(self, token: str) -> UserPayload | None:
        try:
            payload = jwt.decode(
                token,
                self.secret_signature,
                algorithms=[self.algorithm]
            )

            return UserPayload(**payload)
        
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None