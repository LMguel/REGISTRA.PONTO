# auth.py
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import hashlib

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Configuração para usar hash simples ou passlib
import sys
import os

# Adicionar lambda_dependencies ao path se estiver em ambiente Lambda
if '/var/task' in sys.path[0] or 'lambda_dependencies' in os.listdir('.'):
    if 'lambda_dependencies' not in sys.path:
        sys.path.insert(0, 'lambda_dependencies')

# Tentar usar passlib, senão usar implementação simples
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    USE_PASSLIB = True
except ImportError:
    print("⚠️  Passlib não disponível, usando hash simples")
    USE_PASSLIB = False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        return None

def hash_password(password: str):
    if USE_PASSLIB:
        return pwd_context.hash(password)
    else:
        # Implementação simples com salt
        salt = os.urandom(32)
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return salt + pwdhash

def verify_password(plain_password, hashed_password):
    if USE_PASSLIB:
        return pwd_context.verify(plain_password, hashed_password)
    else:
        # Para hash simples
        if isinstance(hashed_password, str):
            # Se for string, provavelmente veio do passlib, tenta verificar
            return False  # Fallback seguro
        salt = hashed_password[:32]
        stored_hash = hashed_password[32:]
        pwdhash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return pwdhash == stored_hash