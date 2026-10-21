import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import CandidateScore, Job
from backend.schemas.schemas import JobRequest, JobResponse, JobUpdate
from backend.services.auth_service import staff_only

router = APIRouter()


def _clean_skills(skills):
    cleaned = []
    for skill in skills or []:
        skill = str(skill).strip()
        if skill and skill.lower() not in {s.lower() for s in cleaned}:
            cleaned.append(skill)
    return cleaned


def _serialize(job: Job, applicant_count: int) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "required_skills": json.loads(job.required_skills or "[]"),
        "created_at": job.created_at,
        "applicant_count": applicant_count,
    }


def _applicant_count(db: Session, job_id: int) -> int:
    return db.query(CandidateScore).filter(CandidateScore.job_id == job_id).count()


@router.post("", response_model=JobResponse, status_code=201)
def create_job(
    payload: JobRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="A job needs a title.")

    job = Job(
        title=payload.title.strip(),
        description=payload.description,
        required_skills=json.dumps(_clean_skills(payload.required_skills)),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobResponse(job_id=job.id, message="Job Created")


@router.get("")
def list_jobs(
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    counts = dict(
        db.query(CandidateScore.job_id, func.count(CandidateScore.id))
        .group_by(CandidateScore.job_id)
        .all()
    )
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return [_serialize(job, counts.get(job.id, 0)) for job in jobs]


@router.get("/{job_id}")
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _serialize(job, _applicant_count(db, job.id))


@router.put("/{job_id}")
def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        if not data["title"].strip():
            raise HTTPException(status_code=422, detail="A job needs a title.")
        job.title = data["title"].strip()
    if "description" in data and data["description"] is not None:
        job.description = data["description"]
    if "required_skills" in data and data["required_skills"] is not None:
        job.required_skills = json.dumps(_clean_skills(data["required_skills"]))

    db.commit()
    db.refresh(job)
    return _serialize(job, _applicant_count(db, job.id))


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Scores point at the job, so remove them too rather than leaving orphans.
    db.query(CandidateScore).filter(CandidateScore.job_id == job_id).delete()
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}
