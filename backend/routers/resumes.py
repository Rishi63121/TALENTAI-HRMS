import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from database.db import PROJECT_ROOT, get_db
from backend.models.models import Candidate
from backend.schemas.schemas import ResumeUploadResponse
from backend.services.auth_service import staff_only
from backend.services.resume_service import parse_resume
from backend.services.rate_limit import HEAVY_LIMIT, limiter

router = APIRouter()

UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=ResumeUploadResponse)
@limiter.limit(HEAVY_LIMIT)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(staff_only),
):
    original = file.filename or ""
    if not original.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted. Please export your resume as a PDF.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="That file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="That file is larger than the 10 MB limit.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="That file does not look like a valid PDF.")

    # Never trust the client's filename for a path: store under a random name.
    dest_path: Path = UPLOAD_DIR / f"{uuid.uuid4().hex}.pdf"
    dest_path.write_bytes(content)

    parsed = parse_resume(str(dest_path))

    # Same resume content -> same candidate, even when no email can be found in the text.
    fingerprint = hashlib.sha1(content).hexdigest()[:16]
    email = (parsed.get("email") or f"unknown_{fingerprint}@talentai.local").lower()
    candidate = db.query(Candidate).filter(Candidate.email == email).first()

    if candidate:
        candidate.name = parsed["name"] or candidate.name
        candidate.education = parsed["education"] or candidate.education
        candidate.experience_years = parsed["experience_years"] or candidate.experience_years
        candidate.resume_path = str(dest_path)
    else:
        candidate = Candidate(
            name=parsed["name"] or "Unknown",
            email=email,
            education=parsed["education"],
            experience_years=parsed["experience_years"],
            resume_path=str(dest_path),
        )
        db.add(candidate)

    db.commit()
    db.refresh(candidate)
    return ResumeUploadResponse(
        candidate_id=candidate.id,
        message="Resume Uploaded",
        name=candidate.name,
        skills=parsed.get("skills", []),
    )
