# backend/utils/utils.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Cookie, HTTPException, Depends
from sqlalchemy.orm import Session
from models.models import User
from schema.schemas import UserCreate
from db.database import get_db

SECRET_KEY = "your-super-secret-jwt-key-change-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _truncate_password_to_72(password: str) -> str:
    """
    Truncate password to 72 bytes (bcrypt limit).
    Handles UTF-8 multi-byte characters safely.
    """
    if password is None:
        return password
    
    # Encode to UTF-8
    password_bytes = password.encode("utf-8")
    
    # If within limit, return as-is
    if len(password_bytes) <= 72:
        return password
    
    # Truncate to 72 bytes and decode, ignoring incomplete characters
    truncated = password_bytes[:72].decode("utf-8", errors="ignore")
    return truncated


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify password at login.
    Automatically truncates to 72 bytes to handle legacy users.
    """
    plain = _truncate_password_to_72(plain)
    return pwd_context.verify(plain, hashed)


# backend/utils/utils.py - add this to get_password_hash function

def get_password_hash(password: str) -> str:
    """Hash password during signup."""
    print(f"🔍 Original password length: {len(password)} chars, {len(password.encode('utf-8'))} bytes")
    
    truncated = _truncate_password_to_72(password)
    
    byte_len = len(truncated.encode('utf-8'))
    print(f"🔍 After truncation: {len(truncated)} chars, {byte_len} bytes")
    
    if byte_len > 72:
        print(f"❌ STILL TOO LONG: {byte_len} bytes")
        truncated = truncated.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        print(f"🔍 Force truncated to: {len(truncated.encode('utf-8'))} bytes")
    
    return pwd_context.hash(truncated)


def create_user(db: Session, user: UserCreate):
    """Create new user - auto-truncates long passwords."""
    # Just hash it - truncation happens inside get_password_hash
    hashed = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed, name=user.name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    """
    Authenticate existing user.
    Truncation handled in verify_password.
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str = Cookie(None, alias="refresh_token")):
    if not token:
        raise HTTPException(status_code=401, detail="No token")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(token_data: dict = Depends(verify_token)):
    return {"email": token_data["sub"]}