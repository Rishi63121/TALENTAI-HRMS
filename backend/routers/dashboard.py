import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import (
    Attendance,
    Candidate,
    CandidateScore,
    Employee,
    Job,
    OnboardingRecord,
    Payroll,
    PerformanceReview,
    User,
)
from backend.schemas.schemas import DashboardResponse
from backend.services.auth_service import get_current_user, staff_only
from backend.services.ranking_service import PIPELINE_STAGES, compute_stage

router = APIRouter()

ATTENDANCE_STATUSES = ["Present", "WFH", "Leave", "Absent"]


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), _: dict = Depends(staff_only)):
    return DashboardResponse(
        total_candidates=db.query(Candidate).count(),
        jobs=db.query(Job).count(),
        screened=db.query(CandidateScore.candidate_id).distinct().count(),
    )


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _pipeline(db: Session) -> List[dict]:
    scored = {row[0] for row in db.query(CandidateScore.candidate_id).distinct().all()}
    onboarding = {o.candidate_id: o.status for o in db.query(OnboardingRecord).all()}
    counts = Counter(
        compute_stage(c.id in scored, onboarding.get(c.id))
        for c in db.query(Candidate.id).all()
    )
    return [{"stage": stage, "count": counts.get(stage, 0)} for stage in PIPELINE_STAGES]


def _top_candidates(db: Session, limit: int = 5) -> List[dict]:
    best: Dict[int, CandidateScore] = {}
    for score in db.query(CandidateScore).order_by(CandidateScore.match_score.desc()).all():
        best.setdefault(score.candidate_id, score)
    ranked = sorted(best.values(), key=lambda s: s.match_score, reverse=True)[:limit]
    candidates = {c.id: c for c in db.query(Candidate).filter(Candidate.id.in_([s.candidate_id for s in ranked])).all()}
    jobs = {j.id: j.title for j in db.query(Job).all()}
    return [
        {
            "candidate_id": s.candidate_id,
            "name": candidates[s.candidate_id].name if s.candidate_id in candidates else "Unknown",
            "score": s.match_score,
            "job_title": jobs.get(s.job_id),
        }
        for s in ranked
    ]


def _attendance_trend(db: Session, days: int = 7, employee_id: Optional[int] = None) -> List[dict]:
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=days - 1)
    query = db.query(Attendance).filter(Attendance.date >= start)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    buckets: Dict[str, Counter] = defaultdict(Counter)
    for record in query.all():
        buckets[record.date.strftime("%Y-%m-%d")][record.status] += 1

    trend = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        key = day.strftime("%Y-%m-%d")
        row = {"date": key, "label": day.strftime("%a")}
        for status in ATTENDANCE_STATUSES:
            row[status] = buckets[key].get(status, 0)
        trend.append(row)
    return trend


def _employee_for(db: Session, current_user: dict) -> Optional[Employee]:
    return (
        db.query(Employee)
        .filter(Employee.email == str(current_user.get("sub", "")).lower())
        .first()
    )


# ---------------------------------------------------------------------------
# role-aware overview
# ---------------------------------------------------------------------------

@router.get("/overview")
def overview(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = str(current_user.get("role", "")).lower()

    if role == "admin":
        return _admin_overview(db)
    if role == "recruiter":
        return _recruiter_overview(db)
    if role == "employee":
        return _employee_overview(db, current_user)
    raise HTTPException(status_code=403, detail="Your role does not have a dashboard.")


def _admin_overview(db: Session) -> dict:
    employees = db.query(Employee).all()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_records = (
        db.query(Attendance)
        .filter(Attendance.date >= today, Attendance.date < today + timedelta(days=1))
        .all()
    )
    present_today = sum(1 for r in today_records if r.status in ("Present", "WFH"))

    departments = Counter((e.department or "Unassigned") for e in employees)

    payroll_by_month: Dict[str, float] = defaultdict(float)
    payroll_order: List[str] = []
    for p in db.query(Payroll).order_by(Payroll.id.asc()).all():
        if p.month not in payroll_by_month:
            payroll_order.append(p.month)
        payroll_by_month[p.month] += p.net_salary or 0
    payroll_trend = [{"month": m, "total": round(payroll_by_month[m], 2)} for m in payroll_order[-6:]]

    ratings = [r.rating for r in db.query(PerformanceReview).all() if r.rating]
    rating_distribution = Counter(ratings)

    return {
        "role": "admin",
        "totals": {
            "employees": len(employees),
            "candidates": db.query(Candidate).count(),
            "open_jobs": db.query(Job).count(),
            "recruiters": db.query(User).filter(User.role == "recruiter").count(),
            "present_today": present_today,
            "monthly_payroll": payroll_trend[-1]["total"] if payroll_trend else 0,
            "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        },
        "pipeline": _pipeline(db),
        "attendance_trend": _attendance_trend(db),
        "departments": [{"name": n, "count": c} for n, c in departments.most_common()],
        "payroll_trend": payroll_trend,
        "rating_distribution": [{"rating": r, "count": rating_distribution.get(r, 0)} for r in range(1, 6)],
        "top_candidates": _top_candidates(db),
    }


def _recruiter_overview(db: Session) -> dict:
    counts = dict(
        db.query(CandidateScore.job_id, func.count(CandidateScore.id))
        .group_by(CandidateScore.job_id)
        .all()
    )
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    scores = [s.match_score for s in db.query(CandidateScore).all()]
    pipeline = _pipeline(db)
    stage_counts = {p["stage"]: p["count"] for p in pipeline}

    return {
        "role": "recruiter",
        "totals": {
            "jobs": len(jobs),
            "candidates": db.query(Candidate).count(),
            "screened": db.query(CandidateScore.candidate_id).distinct().count(),
            "onboarding": stage_counts.get("onboarding", 0),
            "hired": stage_counts.get("hired", 0),
            "avg_match_score": round(sum(scores) / len(scores), 1) if scores else None,
        },
        "pipeline": pipeline,
        "top_candidates": _top_candidates(db),
        "jobs": [
            {
                "id": j.id,
                "title": j.title,
                "applicant_count": counts.get(j.id, 0),
                "required_skills": json.loads(j.required_skills or "[]"),
            }
            for j in jobs[:6]
        ],
    }


def _employee_overview(db: Session, current_user: dict) -> dict:
    employee = _employee_for(db, current_user)
    if not employee:
        return {"role": "employee", "linked": False, "profile": None}

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_records = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee.id, Attendance.date >= month_start)
        .all()
    )
    month_counts = Counter(r.status for r in month_records)

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_record = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee.id,
            Attendance.date >= today,
            Attendance.date < today + timedelta(days=1),
        )
        .first()
    )

    latest_pay = (
        db.query(Payroll)
        .filter(Payroll.employee_id == employee.id)
        .order_by(Payroll.id.desc())
        .first()
    )
    reviews = (
        db.query(PerformanceReview)
        .filter(PerformanceReview.employee_id == employee.id)
        .order_by(PerformanceReview.created_at.desc())
        .all()
    )
    ratings = [r.rating for r in reviews if r.rating]

    return {
        "role": "employee",
        "linked": True,
        "profile": {
            "id": employee.id,
            "name": employee.name,
            "email": employee.email,
            "department": employee.department,
            "designation": employee.designation,
            "joining_date": employee.joining_date,
        },
        "today_status": today_record.status if today_record else None,
        "attendance_month": {s: month_counts.get(s, 0) for s in ATTENDANCE_STATUSES},
        "attendance_trend": _attendance_trend(db, days=7, employee_id=employee.id),
        "latest_payroll": (
            {
                "month": latest_pay.month,
                "basic_salary": latest_pay.basic_salary,
                "bonus": latest_pay.bonus,
                "deductions": latest_pay.deductions,
                "net_salary": latest_pay.net_salary,
            }
            if latest_pay
            else None
        ),
        "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "review_count": len(reviews),
        "latest_review": (
            {
                "rating": reviews[0].rating,
                "comments": reviews[0].comments,
                "created_at": reviews[0].created_at,
            }
            if reviews
            else None
        ),
    }
