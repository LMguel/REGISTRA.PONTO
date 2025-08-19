# auth.py
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os
import hashlib
import base64

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        return None

def hash_password(password: str) -> str:
    """Gera hash com salt usando PBKDF2-HMAC-SHA256"""
    salt = os.urandom(16)
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256', password.encode('utf-8'), salt, 100000
    )
    return base64.b64encode(salt + pwdhash).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha comparando com hash armazenado"""
    decoded = base64.b64decode(hashed_password.encode('utf-8'))
    salt = decoded[:16]
    stored_hash = decoded[16:]
    pwdhash = hashlib.pbkdf2_hmac(
        'sha256', plain_password.encode('utf-8'), salt, 100000
    )
    return pwdhash == stored_hash
