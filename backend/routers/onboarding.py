from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import Candidate, OnboardingRecord
from backend.schemas.schemas import OnboardingRequest, OnboardingResponse
from backend.services.auth_service import staff_only
from backend.services.email_service import auto_email_enabled, queue_candidate_email

router = APIRouter()

VALID_STATUSES = ["pending", "in_progress", "completed", "rejected"]

# Status that triggers a candidate email, and which one.
EMAIL_FOR_STATUS = {"completed": "hired", "rejected": "rejected"}


@router.post("/create", response_model=OnboardingResponse)
def create_onboarding(
    payload: OnboardingRequest,
    background: BackgroundTasks,
    notify: bool = True,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    existing = (
        db.query(OnboardingRecord)
        .filter(OnboardingRecord.candidate_id == payload.candidate_id)
        .first()
    )
    if existing:
        return OnboardingResponse(status=existing.status)

    db.add(OnboardingRecord(candidate_id=payload.candidate_id, status="pending"))
    db.commit()
    # Being accepted into onboarding is the "you're selected" moment.
    email = queue_candidate_email(db, background, candidate, "accepted") if notify and auto_email_enabled() else None
    return OnboardingResponse(status="pending", email=email)


@router.patch("/{candidate_id}/status")
def update_status(
    candidate_id: int,
    status: str,
    background: BackgroundTasks,
    notify: bool = True,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(VALID_STATUSES)}.",
        )
    record = (
        db.query(OnboardingRecord)
        .filter(OnboardingRecord.candidate_id == candidate_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Onboarding record not found.")

    changed = record.status != status
    record.status = status
    db.commit()

    email: Optional[dict] = None
    template = EMAIL_FOR_STATUS.get(status)
    if changed and template and notify and auto_email_enabled():
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if candidate:
            email = queue_candidate_email(db, background, candidate, template)
    return {"candidate_id": candidate_id, "status": status, "email": email}


@router.get("")
def list_onboarding(
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    rows = (
        db.query(OnboardingRecord, Candidate)
        .join(Candidate, Candidate.id == OnboardingRecord.candidate_id)
        .order_by(OnboardingRecord.created_at.desc())
        .all()
    )
    return [
        {
            "candidate_id": record.candidate_id,
            "name": candidate.name,
            "email": candidate.email,
            "status": record.status,
            "created_at": record.created_at,
        }
        for record, candidate in rows
    ]
