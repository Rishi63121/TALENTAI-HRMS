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
    # Checked after the password so the account state is never revealed to someone who does not know it.
    if user.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your recruiter account is waiting for admin approval. You'll be able to sign in as soon as an administrator approves it.",
        )
    if user.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account request was declined or access was removed by an administrator. Please contact them if you think this is a mistake.",
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
        # Recruiters can create jobs and see candidate data, so an admin must approve them first.
        status="pending" if role == "recruiter" else "active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Request received. An administrator needs to approve your recruiter account before you can sign in."
        if user.status == "pending"
        else "User registered",
        "user_id": user.id,
        "status": user.status,
    }


@router.get("/me")
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Used by the UI to validate a stored session on page load."""
    user = db.query(User).filter(User.email == current_user.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="This account no longer exists.")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="This account is not active.")
    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }
