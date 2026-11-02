"""AI hiring copilot: answers questions about the live data.

Uses Groq when a key works; otherwise a rule-based answer built from the same snapshot, so it is always
useful and never invents numbers.
"""
import json
import logging
import re
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import Attendance, Candidate, CandidateScore, Employee, Job, Payroll, User
from backend.services import ai_service
from backend.services.auth_service import staff_only

logger = logging.getLogger("talentai.copilot")
router = APIRouter()


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(min_length=1, max_length=20)


def _job_skills(raw) -> list:
    try:
        data = json.loads(raw or "[]")
    except (TypeError, ValueError):
        return []
    return [str(s) for s in data] if isinstance(data, list) else []


def _snapshot(db: Session) -> dict:
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    statuses: dict = {}
    for a in db.query(Attendance).filter(Attendance.date >= today, Attendance.date < today + timedelta(days=1)):
        statuses[a.status] = statuses.get(a.status, 0) + 1

    best: dict = {}
    for s in db.query(CandidateScore).order_by(CandidateScore.match_score.desc()).all():
        best.setdefault(s.candidate_id, s)
    names = {c.id: c.name for c in db.query(Candidate).all()}
    job_titles = {j.id: j.title for j in db.query(Job).all()}
    top = [
        {"name": names.get(s.candidate_id, "?"), "job": job_titles.get(s.job_id, "?"), "score": round(s.match_score)}
        for s in sorted(best.values(), key=lambda s: s.match_score, reverse=True)[:5]
    ]

    departments: dict = {}
    employees = db.query(Employee).all()
    for e in employees:
        key = e.department or "Unassigned"
        departments[key] = departments.get(key, 0) + 1

    latest_month = None
    payroll_total = 0.0
    for p in db.query(Payroll).order_by(Payroll.id.asc()).all():
        if p.month != latest_month:
            latest_month, payroll_total = p.month, 0.0
        payroll_total += p.net_salary or 0

    return {
        "candidates": db.query(Candidate).count(),
        "screened": db.query(CandidateScore.candidate_id).distinct().count(),
        "jobs": [{"title": j.title, "skills": _job_skills(j.required_skills)} for j in db.query(Job).all()],
        "employees": len(employees),
        "departments": departments,
        "recruiters": db.query(User).filter(User.role == "recruiter", User.status == "active").count(),
        "attendance_today": statuses,
        "top_candidates": top,
        "latest_payroll": {"month": latest_month, "total": round(payroll_total, 2)} if latest_month else None,
    }


def _fallback_answer(question: str, s: dict) -> str:
    q = question.lower()

    def has(*words: str) -> bool:
        return any(re.search(rf"\b{w}", q) for w in words)

    if has("top", "best", "strongest", "rank", "shortlist"):
        if not s["top_candidates"]:
            return "No candidates have been screened yet. Upload resumes in Resume Screening and I can rank them."
        rows = "\n".join(
            f"{i}. {c['name']} for {c['job']} ({c['score']}% match)" for i, c in enumerate(s["top_candidates"], 1)
        )
        return f"Here are your top screened candidates:\n{rows}"
    if has("job", "role", "opening", "position", "hiring"):
        if not s["jobs"]:
            return "There are no open jobs yet. Create one from the Jobs page."
        rows = "\n".join(f"- {j['title']} ({', '.join(j['skills'][:5]) or 'no skills listed'})" for j in s["jobs"][:8])
        return f"You have {len(s['jobs'])} open job(s):\n{rows}"
    if has("attend", "present", "absent", "leave", "wfh", "today"):
        a = s["attendance_today"]
        if not a:
            return "No attendance has been recorded for today yet."
        return "Today's attendance: " + ", ".join(f"{k} {v}" for k, v in sorted(a.items()))
    if has("payroll", "salary", "pay"):
        p = s["latest_payroll"]
        return f"Latest payroll ({p['month']}) totals {p['total']:,.0f}." if p else "No payroll has been processed yet."
    if has("employee", "headcount", "team", "department", "people", "staff"):
        depts = ", ".join(f"{k} {v}" for k, v in sorted(s["departments"].items(), key=lambda kv: -kv[1])) or "none yet"
        return f"You have {s['employees']} employees ({depts}) and {s['recruiters']} recruiter(s)."
    if has("candidate", "applicant", "pipeline", "screen"):
        return f"There are {s['candidates']} candidates, {s['screened']} of them screened."
    return (
        f"Quick snapshot: {s['candidates']} candidates ({s['screened']} screened), {len(s['jobs'])} open jobs, "
        f"{s['employees']} employees. Ask me about top candidates, open jobs, today's attendance, payroll or headcount."
    )


@router.post("/chat")
def chat(payload: ChatRequest, db: Session = Depends(get_db), _: dict = Depends(staff_only)):
    snapshot = _snapshot(db)
    question = payload.messages[-1].content

    system = (
        "You are TalentAI Copilot, an assistant for HR admins and recruiters. Answer ONLY from the JSON snapshot of "
        "the company's live data below. If the data does not contain the answer, say so. Be concise (under 120 words), "
        "plain text, use short lists when helpful. Never invent people, numbers or jobs.\n\nSNAPSHOT:\n"
        + json.dumps(snapshot, default=str)
    )
    history = [{"role": m.role, "content": m.content} for m in payload.messages[-8:]]
    reply = ai_service.chat_completion([{"role": "system", "content": system}, *history])
    if reply:
        return {"reply": reply, "source": "ai"}
    return {"reply": _fallback_answer(question, snapshot), "source": "data"}
