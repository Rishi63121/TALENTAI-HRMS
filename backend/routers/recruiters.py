from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import User
from backend.services.auth_service import admin_only

router = APIRouter()


@router.get("")
def get_recruiters(
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    recruiters = (
        db.query(User)
        .filter(User.role == "recruiter")
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "joined_at": r.created_at,
        }
        for r in recruiters
    ]
