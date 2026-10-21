import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from backend.services.rate_limit import HEAVY_LIMIT, limiter
from backend.models.models import (
    Candidate,
    Job,
    CandidateScore,
)
from backend.services.auth_service import staff_only
from backend.services.ai_service import score_candidate
from backend.services.resume_service import parse_resume
from backend.services.ranking_service import recompute_ranks

router = APIRouter()


class ResumeScreenRequest(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None


# =====================================================
# GET SCREENING RESULT (if already screened)
# =====================================================

@router.get("/{candidate_id}")
def get_screening_result(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    score_record = (
        db.query(CandidateScore)
        .filter(CandidateScore.candidate_id == candidate_id)
        .order_by(CandidateScore.match_score.desc())
        .first()
    )

    if not score_record:
        raise HTTPException(status_code=404, detail="No screening result found")

    return {
        "candidate_id": candidate_id,
        "score": score_record.match_score,
        "matched_skills": json.loads(score_record.matched_skills or "[]"),
        "missing_skills": json.loads(score_record.missing_skills or "[]"),
        "rank": score_record.rank,
    }


# =====================================================
# SCREEN A CANDIDATE (POST)
# =====================================================

@router.post("")
@limiter.limit(HEAVY_LIMIT)
def screen_resume(
    request: Request,
    payload: ResumeScreenRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidate = (
        db.query(Candidate)
        .filter(Candidate.id == payload.candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # If no job_id provided, try to find the first available job
    job_id = payload.job_id
    if not job_id:
        first_job = db.query(Job).first()
        if first_job:
            job_id = first_job.id
        else:
            raise HTTPException(status_code=400, detail="No jobs available. Please create a job first.")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    required_skills = json.loads(job.required_skills or "[]")

    resume_text = ""
    candidate_skills = []

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

    # Upsert score record
    score_record = (
        db.query(CandidateScore)
        .filter(
            CandidateScore.candidate_id == payload.candidate_id,
            CandidateScore.job_id == job_id,
        )
        .first()
    )

    if score_record:
        score_record.match_score = result["match_score"]
        score_record.matched_skills = json.dumps(result["matched_skills"])
        score_record.missing_skills = json.dumps(result["missing_skills"])
    else:
        score_record = CandidateScore(
            candidate_id=payload.candidate_id,
            job_id=job_id,
            match_score=result["match_score"],
            matched_skills=json.dumps(result["matched_skills"]),
            missing_skills=json.dumps(result["missing_skills"]),
        )
        db.add(score_record)

    db.commit()
    recompute_ranks(job_id, db)

    return {
        "candidate_id": payload.candidate_id,
        "score": result["match_score"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "summary": result.get("summary", ""),
        "source": result.get("source", "ai"),
    }
