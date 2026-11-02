"""Read-only insight endpoints: the activity feed behind the notification bell and the skills radar."""
import json
from collections import Counter
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import (
    Candidate,
    CandidateScore,
    EmailLog,
    Employee,
    Job,
    OnboardingRecord,
    PerformanceReview,
    User,
)
from backend.services.auth_service import staff_only

router = APIRouter()


def _skills(raw: Optional[str]) -> List[str]:
    try:
        data = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [str(s).strip() for s in data if str(s).strip()] if isinstance(data, list) else []


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value else None


@router.get("/activity")
def activity(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: dict = Depends(staff_only),
):
    """Recent events across recruitment and HR, newest first. Derived from existing tables, no extra storage."""
    since = datetime.utcnow() - timedelta(days=60)
    events: List[dict] = []

    for c in db.query(Candidate).filter(Candidate.created_at >= since).order_by(Candidate.created_at.desc()).limit(limit):
        events.append({"id": f"cand-{c.id}", "kind": "candidate", "title": "New applicant", "detail": c.name, "at": c.created_at, "link": "candidates"})

    for j in db.query(Job).filter(Job.created_at >= since).order_by(Job.created_at.desc()).limit(limit):
        events.append({"id": f"job-{j.id}", "kind": "job", "title": "Job posted", "detail": j.title, "at": j.created_at, "link": "jobs"})

    candidates = {c.id: c.name for c in db.query(Candidate.id, Candidate.name).all()}
    for o in db.query(OnboardingRecord).filter(OnboardingRecord.created_at >= since).order_by(OnboardingRecord.created_at.desc()).limit(limit):
        who = candidates.get(o.candidate_id, "A candidate")
        events.append({"id": f"onb-{o.id}", "kind": "onboarding", "title": f"Onboarding {str(o.status).replace('_', ' ')}", "detail": who, "at": o.created_at, "link": "onboarding"})

    for e in db.query(EmailLog).filter(EmailLog.created_at >= since).order_by(EmailLog.created_at.desc()).limit(limit):
        if e.template == "test":
            continue
        events.append({"id": f"mail-{e.id}", "kind": "email", "title": f"{(e.template or 'Email').title()} email {e.status}", "detail": e.to_email or "", "at": e.created_at, "link": None})

    employees = {e.id: e.name for e in db.query(Employee.id, Employee.name).all()}
    for r in db.query(PerformanceReview).filter(PerformanceReview.created_at >= since).order_by(PerformanceReview.created_at.desc()).limit(limit):
        events.append({"id": f"rev-{r.id}", "kind": "review", "title": f"Review filed ({r.rating}/5)", "detail": employees.get(r.employee_id, "An employee"), "at": r.created_at, "link": "performance"})

    if str(current_user.get("role", "")).lower() == "admin":
        for u in db.query(User).filter(User.role == "recruiter", User.status == "pending").order_by(User.created_at.desc()).limit(limit):
            events.append({"id": f"req-{u.id}", "kind": "recruiter", "title": "Recruiter awaiting approval", "detail": u.name, "at": u.created_at, "link": "recruiters"})

    events = [e for e in events if e["at"]]
    events.sort(key=lambda e: e["at"], reverse=True)
    return [{**e, "at": _iso(e["at"])} for e in events[:limit]]


@router.get("/skills")
def skills_radar(db: Session = Depends(get_db), _: dict = Depends(staff_only)):
    """Top skills by how many jobs ask for them (demand) vs how many screenings matched them (supply)."""
    demand: Counter = Counter()
    display = {}
    for job in db.query(Job).all():
        for s in _skills(job.required_skills):
            demand[s.lower()] += 1
            display.setdefault(s.lower(), s)

    supply: Counter = Counter()
    for score in db.query(CandidateScore).all():
        for s in _skills(score.matched_skills):
            supply[s.lower()] += 1

    top = [k for k, _ in demand.most_common(6)]
    return [{"skill": display[k], "demand": demand[k], "supply": supply.get(k, 0)} for k in top]
