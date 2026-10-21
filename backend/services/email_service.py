"""Candidate emails (accepted / hired / rejected), sent over SMTP in the background.

Environment:
  SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASSWORD
  SMTP_SECURITY   starttls (default, port 587) | ssl (port 465) | none
  SMTP_FROM       "TalentAI Recruiting <jobs@example.com>"; defaults to SMTP_USER
  EMAIL_REPLY_TO  optional reply-to address
  COMPANY_NAME    used in the emails, default "TalentAI"
  AUTO_EMAIL      "false" stops status changes from emailing candidates (default on)

Without SMTP_HOST nothing is sent: each attempt is recorded as "skipped" and can be re-sent once mail is set up.
"""
import html
import logging
import os
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from typing import Optional, Tuple

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from backend.models.models import Candidate, CandidateScore, EmailLog, Job
from database.db import SessionLocal

logger = logging.getLogger("talentai.email")


def company_name() -> str:
    return _clean(os.getenv("COMPANY_NAME", "TalentAI")) or "TalentAI"


def auto_email_enabled() -> bool:
    return os.getenv("AUTO_EMAIL", "true").lower() != "false"


def smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def _clean(value) -> str:
    """Single line only: stops header injection through names or job titles."""
    return " ".join(str(value or "").split())


# --------------------------------------------------------------------------- templates

def render(template: str, name: str, job_title: Optional[str]) -> Tuple[str, str, str]:
    """Returns (subject, plain text, html)."""
    name = _clean(name) or "there"
    company = company_name()
    role = _clean(job_title)
    for_role = f" for the {role} position" if role else ""

    if template == "accepted":
        subject = f"Good news from {company}" + (f" - {role}" if role else "")
        lines = [
            f"Hi {name},",
            f"Thank you for your time and interest. We are pleased to tell you that you have been selected to move forward{for_role} at {company}.",
            "Our team will be in touch shortly with the next steps for your onboarding.",
        ]
    elif template == "hired":
        subject = f"Welcome to {company}!"
        lines = [
            f"Hi {name},",
            f"Your onboarding is complete and we are delighted to welcome you{for_role} at {company}.",
            "We are looking forward to working with you. Please reply to this email if you have any questions before your first day.",
        ]
    elif template == "rejected":
        subject = f"Your application at {company}" + (f" - {role}" if role else "")
        lines = [
            f"Hi {name},",
            f"Thank you for your interest in {company} and for the time you spent with us{for_role}.",
            "After careful consideration we have decided not to move forward with your application at this time. This was not an easy decision.",
            "We will keep your details on file and encourage you to apply for future openings that match your skills.",
            "We wish you every success in your search.",
        ]
    elif template == "test":
        subject = f"{company} email test"
        lines = [f"Hi {name},", "This is a test message. Your email settings work."]
    else:
        raise ValueError(f"Unknown email template: {template}")

    text = "\n\n".join(lines + [f"Kind regards,\n{company} Recruiting Team"])
    body = "".join(f"<p>{html.escape(line)}</p>" for line in lines)
    body += f"<p>Kind regards,<br>{html.escape(company)} Recruiting Team</p>"
    page = f'<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a2e">{body}</div>'
    return subject, text, page


# --------------------------------------------------------------------------- sending

def _build_message(to_email: str, subject: str, text: str, page: str) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or ""
    msg["To"] = to_email
    msg["Subject"] = subject
    if os.getenv("EMAIL_REPLY_TO"):
        msg["Reply-To"] = os.getenv("EMAIL_REPLY_TO")
    msg.set_content(text)
    msg.add_alternative(page, subtype="html")
    return msg


def _send_smtp(msg: EmailMessage) -> None:
    host = os.environ["SMTP_HOST"]
    security = os.getenv("SMTP_SECURITY", "starttls").lower()
    port = int(os.getenv("SMTP_PORT") or (465 if security == "ssl" else 587))
    user, password = os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD")
    context = ssl.create_default_context()
    if security == "ssl":
        server = smtplib.SMTP_SSL(host, port, timeout=20, context=context)
    else:
        server = smtplib.SMTP(host, port, timeout=20)
    with server:
        if security == "starttls":
            server.starttls(context=context)
        if user:
            server.login(user, password or "")
        server.send_message(msg)


def _job_title(db: Session, candidate_id: Optional[int]) -> Optional[str]:
    """The job the candidate matched best, used to personalise the email."""
    if not candidate_id:
        return None
    row = (
        db.query(Job.title)
        .join(CandidateScore, CandidateScore.job_id == Job.id)
        .filter(CandidateScore.candidate_id == candidate_id)
        .order_by(CandidateScore.match_score.desc())
        .first()
    )
    return row[0] if row else None


def _deliver(log_id: int) -> None:
    """Background task: send one logged email and record the outcome."""
    with SessionLocal() as db:
        log = db.get(EmailLog, log_id)
        if not log:
            return
        try:
            if not smtp_configured():
                log.status, log.error = "skipped", "Email is not set up yet (SMTP_HOST is missing in .env)."
            else:
                candidate = db.get(Candidate, log.candidate_id) if log.candidate_id else None
                subject, text, page = render(
                    log.template, candidate.name if candidate else "there", _job_title(db, log.candidate_id)
                )
                log.subject = subject
                _send_smtp(_build_message(log.to_email, subject, text, page))
                log.status, log.error, log.sent_at = "sent", None, datetime.utcnow()
        except Exception as exc:  # noqa: BLE001 - every failure is recorded, never crashes the worker
            logger.warning("Email %s to %s failed: %s", log.template, log.to_email, exc)
            log.status, log.error = "failed", str(exc)[:500]
        db.commit()


# --------------------------------------------------------------------------- public API

def queue_candidate_email(db: Session, background: BackgroundTasks, candidate: Candidate, template: str) -> dict:
    """Log an email and send it after the HTTP response. Returns a summary the UI can show."""
    if not candidate.email or not candidate.email.strip():
        return {"queued": False, "template": template, "reason": "This candidate has no email address."}

    already = (
        db.query(EmailLog)
        .filter(
            EmailLog.candidate_id == candidate.id,
            EmailLog.template == template,
            EmailLog.status.in_(["queued", "sent"]),
        )
        .first()
    )
    if already:
        return {"queued": False, "template": template, "reason": "This email was already sent to the candidate."}

    subject, _, _ = render(template, candidate.name, _job_title(db, candidate.id))
    log = EmailLog(
        candidate_id=candidate.id, to_email=candidate.email.strip(), template=template, subject=subject, status="queued"
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    background.add_task(_deliver, log.id)

    if not smtp_configured():
        return {
            "queued": False,
            "template": template,
            "email_id": log.id,
            "reason": "Email is not set up yet, so nothing was sent. It is saved and can be re-sent later.",
        }
    return {"queued": True, "template": template, "email_id": log.id}


def requeue(db: Session, background: BackgroundTasks, log: EmailLog) -> None:
    log.status, log.error = "queued", None
    db.commit()
    background.add_task(_deliver, log.id)
