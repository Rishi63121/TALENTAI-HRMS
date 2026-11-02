from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import User
from backend.services.auth_service import admin_only

router = APIRouter()


def _serialize(r: User) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "email": r.email,
        "status": r.status or "active",
        "joined_at": r.created_at.isoformat() + "Z" if r.created_at else None,
    }


@router.get("")
def get_recruiters(
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    """All recruiters, with pending requests first so an admin sees what needs a decision."""
    recruiters = db.query(User).filter(User.role == "recruiter").order_by(User.created_at.desc()).all()
    order = {"pending": 0, "active": 1, "rejected": 2}
    recruiters.sort(key=lambda r: order.get(r.status or "active", 1))
    return [_serialize(r) for r in recruiters]


def _set_status(recruiter_id: int, new_status: str, db: Session) -> dict:
    user = db.query(User).filter(User.id == recruiter_id, User.role == "recruiter").first()
    if not user:
        raise HTTPException(status_code=404, detail="Recruiter not found.")
    user.status = new_status
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.post("/{recruiter_id}/approve")
def approve_recruiter(recruiter_id: int, db: Session = Depends(get_db), _: dict = Depends(admin_only)):
    """Approve a pending request, or restore someone whose access was removed."""
    return _set_status(recruiter_id, "active", db)


@router.post("/{recruiter_id}/reject")
def reject_recruiter(recruiter_id: int, db: Session = Depends(get_db), _: dict = Depends(admin_only)):
    """Decline a pending request, or remove an active recruiter's access (their open sessions stop working too)."""
    return _set_status(recruiter_id, "rejected", db)
