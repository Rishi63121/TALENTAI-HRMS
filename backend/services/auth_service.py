import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.models.models import User
from database.db import get_db

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

logger = logging.getLogger("talentai.auth")

_DEFAULT_SECRET = "talentai-secret-key-change-in-production"
SECRET_KEY = os.getenv("SECRET_KEY") or _DEFAULT_SECRET
ALGORITHM = os.getenv("ALGORITHM") or "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or 60 * 8)

if SECRET_KEY == _DEFAULT_SECRET:
    logger.warning("SECRET_KEY is not set - using an insecure default. Set it in .env before deploying.")

ROLES = ("admin", "recruiter", "employee")

# bcrypt cost (log2 rounds). 12 is a sound production default. Tiny hosts (e.g. a free 0.1-CPU instance) take ~2 s per
# hash at 12, so a public demo with throwaway passwords can set BCRYPT_ROUNDS=6. Existing hashes keep verifying: the
# cost is stored inside each hash.
BCRYPT_ROUNDS = max(4, min(15, int(os.getenv("BCRYPT_ROUNDS") or 12)))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=BCRYPT_ROUNDS)
# auto_error=False so a missing header returns a clean 401 (not 403) that the UI can explain.
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You need to sign in to access this.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    # An admin can revoke a recruiter at any time; that must also end sessions that are already signed in.
    account = db.query(User.status).filter(User.email == payload.get("sub")).first()
    if account is not None and account[0] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your access was removed by an administrator.",
        )
    return payload


def require_roles(*allowed: str):
    """Dependency factory: only let users with one of `allowed` roles through."""
    allowed_set = {r.lower() for r in allowed}

    def checker(current_user: dict = Depends(get_current_user)) -> dict:
        role = str(current_user.get("role", "")).lower()
        if role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your role ({role or 'unknown'}) does not have permission to do this.",
            )
        return current_user

    return checker


# Convenience dependencies
admin_only = require_roles("admin")
staff_only = require_roles("admin", "recruiter")
