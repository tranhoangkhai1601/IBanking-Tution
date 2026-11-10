
import jwt
from app.config import config

class JwtProvider:
    def __init__(self, userInfo, secret_signature, token_life):
        
        self.userInfo = userInfo
        self.secret_signature = secret_signature
        self.token_life = token_life

    async def generate_token():
