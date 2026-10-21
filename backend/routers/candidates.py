import json
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import (
    Candidate,
    CandidateScore,
    EmailLog,
    InterviewQuestion,
    Job,
    OnboardingRecord,
)
from backend.schemas.schemas import (
    CandidateRankItem,
    CandidateScoreResponse,
    ScreenRequest,
)
from backend.services.ai_service import score_candidate
from backend.services.auth_service import staff_only
from backend.services.ranking_service import compute_stage, recompute_ranks
from backend.services.resume_service import parse_resume

router = APIRouter()


class CandidateCreateRequest(BaseModel):
    name: str
    email: str
    job_id: Optional[int] = None
    skills: Optional[List[str]] = []
    experience: Optional[str] = ""


def _best_scores(db: Session) -> Dict[int, CandidateScore]:
    """Highest-scoring CandidateScore per candidate, fetched in one query."""
    best: Dict[int, CandidateScore] = {}
    for score in db.query(CandidateScore).order_by(CandidateScore.match_score.desc()).all():
        best.setdefault(score.candidate_id, score)
    return best


def _serialize(
    candidate: Candidate,
    score: Optional[CandidateScore],
    onboarding: Optional[OnboardingRecord],
    job_titles: Dict[int, str],
    detailed: bool = False,
) -> dict:
    onboarding_status = onboarding.status if onboarding else None
    data = {
        "id": candidate.id,
        "candidate_id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "experience_years": candidate.experience_years,
        "score": score.match_score if score else None,
        "rank": score.rank if score else None,
        "matched_skills": json.loads(score.matched_skills or "[]") if score else [],
        "missing_skills": json.loads(score.missing_skills or "[]") if score else [],
        "job_id": score.job_id if score else None,
        "job_title": job_titles.get(score.job_id) if score else None,
        "stage": compute_stage(score is not None, onboarding_status),
        # Kept for older clients: onboarding status or "not_started".
        "status": onboarding_status or "not_started",
        "created_at": candidate.created_at,
    }
    if detailed:
        data["education"] = candidate.education
        data["resume_path"] = candidate.resume_path
        data["has_resume"] = bool(candidate.resume_path)
    return data


@router.post("", status_code=201)
def create_candidate(
    payload: CandidateCreateRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    email = payload.email.strip().lower()
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="A candidate needs a name.")
    if db.query(Candidate).filter(Candidate.email == email).first():
        raise HTTPException(status_code=400, detail="A candidate with this email already exists.")

    try:
        exp_years = int(payload.experience) if payload.experience else 0
    except ValueError:
        exp_years = 0

    candidate = Candidate(name=payload.name.strip(), email=email, experience_years=exp_years)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "experience_years": candidate.experience_years,
        "message": "Candidate created successfully",
    }


@router.post("/screen", response_model=CandidateScoreResponse)
def screen_candidate(
    payload: ScreenRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    required_skills = json.loads(job.required_skills or "[]")

    resume_text = ""
    candidate_skills: List[str] = []
    if candidate.resume_path:
        parsed = parse_resume(candidate.resume_path)
        resume_text = parsed.get("raw_text", "")
        candidate_skills = parsed.get("skills", [])

    result = score_candidate(
        resume_text=resume_text,
        candidate_skills=candidate_skills,
        job_title=job.title,
        job_description=job.description or "",
        required_skills=required_skills,
    )

    score_record = (
        db.query(CandidateScore)
        .filter(
            CandidateScore.candidate_id == payload.candidate_id,
            CandidateScore.job_id == payload.job_id,
        )
        .first()
    )
    if score_record:
        score_record.match_score = result["match_score"]
        score_record.matched_skills = json.dumps(result["matched_skills"])
        score_record.missing_skills = json.dumps(result["missing_skills"])
    else:
        db.add(
            CandidateScore(
                candidate_id=payload.candidate_id,
                job_id=payload.job_id,
                match_score=result["match_score"],
                matched_skills=json.dumps(result["matched_skills"]),
                missing_skills=json.dumps(result["missing_skills"]),
            )
        )
    db.commit()
    recompute_ranks(payload.job_id, db)

    return CandidateScoreResponse(
        candidate_id=payload.candidate_id,
        score=result["match_score"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        summary=result.get("summary", ""),
        source=result.get("source", "ai"),
    )


@router.get("/rankings", response_model=List[CandidateRankItem])
def get_rankings(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    query = db.query(CandidateScore)
    if job_id:
        query = query.filter(CandidateScore.job_id == job_id)

    scores = query.order_by(CandidateScore.rank.asc()).all()
    return [
        CandidateRankItem(candidate_id=s.candidate_id, rank=s.rank, score=s.match_score)
        for s in scores
    ]


@router.get("/{candidate_id}")
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    best = (
        db.query(CandidateScore)
        .filter(CandidateScore.candidate_id == candidate_id)
        .order_by(CandidateScore.match_score.desc())
        .first()
    )
    onboarding = (
        db.query(OnboardingRecord)
        .filter(OnboardingRecord.candidate_id == candidate_id)
        .first()
    )
    job_titles = {j.id: j.title for j in db.query(Job).all()}
    return _serialize(candidate, best, onboarding, job_titles, detailed=True)


@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    db.query(CandidateScore).filter(CandidateScore.candidate_id == candidate_id).delete()
    db.query(InterviewQuestion).filter(InterviewQuestion.candidate_id == candidate_id).delete()
    db.query(OnboardingRecord).filter(OnboardingRecord.candidate_id == candidate_id).delete()
    db.query(EmailLog).filter(EmailLog.candidate_id == candidate_id).delete()
    db.delete(candidate)
    db.commit()
    return {"message": "Candidate deleted"}


@router.get("")
def list_candidates(
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidates = db.query(Candidate).order_by(Candidate.created_at.desc()).all()
    best = _best_scores(db)
    onboarding = {o.candidate_id: o for o in db.query(OnboardingRecord).all()}
    job_titles = {j.id: j.title for j in db.query(Job).all()}

    return [
        _serialize(c, best.get(c.id), onboarding.get(c.id), job_titles)
        for c in candidates
    ]
