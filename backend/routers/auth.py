from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import User
from backend.schemas.schemas import LoginRequest, LoginResponse, UserCreate
from backend.services.rate_limit import AUTH_LIMIT, limiter
from backend.services.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter()

# Admins are never self-registered; they are created by seed.py or by another admin.
SELF_REGISTER_ROLES = {"recruiter", "employee"}


@router.post("/login", response_model=LoginResponse)
@limiter.limit(AUTH_LIMIT)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    token = create_access_token(
        {
            "sub": user.email,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "user_id": user.id,
        }
    )
    return LoginResponse(
        token=token,
        role=user.role,
        name=user.name,
        email=user.email,
        user_id=user.id,
    )


@router.post("/register", status_code=201)
@limiter.limit(AUTH_LIMIT)
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    role = (payload.role or "recruiter").strip().lower()

    if role not in SELF_REGISTER_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You can only register as a recruiter or an employee. Admin accounts are created by an administrator.",
        )
    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters long.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered", "user_id": user.id}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Used by the UI to validate a stored session on page load."""
    user = db.query(User).filter(User.email == current_user.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="This account no longer exists.")
    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }
