import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database.db import get_db
from backend.services.rate_limit import HEAVY_LIMIT, limiter
from backend.models.models import Candidate, InterviewQuestion, CandidateScore, Job
from backend.schemas.schemas import InterviewQuestionRequest, InterviewQuestionResponse
from backend.services.auth_service import staff_only
from backend.services.ai_service import generate_interview_questions
from backend.services.resume_service import parse_resume

router = APIRouter()


@router.post("/questions", response_model=InterviewQuestionResponse)
@limiter.limit(HEAVY_LIMIT)
def get_interview_questions(
    request: Request,
    payload: InterviewQuestionRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Determine associated job (highest-scoring)
    top_score = (
        db.query(CandidateScore)
        .filter(CandidateScore.candidate_id == payload.candidate_id)
        .order_by(CandidateScore.match_score.desc())
        .first()
    )
    job_title = ""
    if top_score:
        job = db.query(Job).filter(Job.id == top_score.job_id).first()
        job_title = job.title if job else ""

    resume_text = ""
    candidate_skills = []
    if candidate.resume_path:
        parsed = parse_resume(candidate.resume_path)
        resume_text = parsed.get("raw_text", "")
        candidate_skills = parsed.get("skills", [])

    questions = generate_interview_questions(
        candidate_name=candidate.name,
        candidate_skills=candidate_skills,
        resume_text=resume_text,
        job_title=job_title,
    )

    # Persist generated questions
    record = InterviewQuestion(
        candidate_id=payload.candidate_id,
        questions=json.dumps(questions),
    )
    db.add(record)
    db.commit()

    return InterviewQuestionResponse(questions=questions)


@router.get("/{candidate_id}/history")
def get_question_history(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    records = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.candidate_id == candidate_id)
        .order_by(InterviewQuestion.generated_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "questions": json.loads(r.questions or "[]"),
            "generated_at": r.generated_at,
        }
        for r in records
    ]
