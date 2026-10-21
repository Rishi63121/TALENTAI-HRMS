from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.models.models import EmailLog
from backend.services import email_service
from backend.services.auth_service import admin_only, staff_only
from database.db import get_db

router = APIRouter()


def _serialize(log: EmailLog) -> dict:
    return {
        "id": log.id,
        "candidate_id": log.candidate_id,
        "to_email": log.to_email,
        "template": log.template,
        "subject": log.subject,
        "status": log.status,
        "error": log.error,
        "created_at": log.created_at,
        "sent_at": log.sent_at,
    }


@router.get("/status")
def email_status(_: dict = Depends(staff_only)):
    """Lets the UI explain whether candidate emails will actually go out."""
    return {
        "configured": email_service.smtp_configured(),
        "automatic": email_service.auto_email_enabled(),
        "company": email_service.company_name(),
    }


@router.get("")
def list_emails(limit: int = 100, db: Session = Depends(get_db), _: dict = Depends(staff_only)):
    limit = max(1, min(limit, 500))
    rows = db.query(EmailLog).order_by(EmailLog.created_at.desc(), EmailLog.id.desc()).limit(limit).all()
    return [_serialize(r) for r in rows]


@router.post("/{email_id}/resend")
def resend_email(
    email_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    log = db.get(EmailLog, email_id)
    if not log:
        raise HTTPException(status_code=404, detail="Email not found.")
    if log.status not in ("failed", "skipped"):
        raise HTTPException(status_code=400, detail="Only emails that failed or were skipped can be re-sent.")
    if not email_service.smtp_configured():
        raise HTTPException(status_code=400, detail="Email is not set up yet. Add the SMTP settings to .env first.")
    email_service.requeue(db, background, log)
    return {"id": log.id, "status": "queued"}


class TestEmail(BaseModel):
    to: EmailStr


@router.post("/test")
def send_test_email(payload: TestEmail, background: BackgroundTasks, db: Session = Depends(get_db), _: dict = Depends(admin_only)):
    """Admin check that the SMTP settings work, sent to an address of their choice."""
    if not email_service.smtp_configured():
        raise HTTPException(status_code=400, detail="Email is not set up yet. Add the SMTP settings to .env first.")
    log = EmailLog(to_email=str(payload.to), template="test", subject=f"{email_service.company_name()} email test", status="queued")
    db.add(log)
    db.commit()
    db.refresh(log)
    background.add_task(email_service._deliver, log.id)
    return {"id": log.id, "status": "queued"}
