from typing import List, Optional

from sqlalchemy.orm import Session

from backend.models.models import CandidateScore

# Pipeline stages shown in the UI, in order.
PIPELINE_STAGES = ["applied", "screened", "onboarding", "hired", "rejected"]


def recompute_ranks(job_id: int, db: Session) -> None:
    """
    Re-rank all CandidateScore rows for a given job by descending match_score.
    Updates the `rank` column in-place.
    """
    scores: List[CandidateScore] = (
        db.query(CandidateScore)
        .filter(CandidateScore.job_id == job_id)
        .order_by(CandidateScore.match_score.desc())
        .all()
    )
    for position, record in enumerate(scores, start=1):
        record.rank = position
    db.commit()


def compute_stage(has_score: bool, onboarding_status: Optional[str]) -> str:
    """
    Derive a candidate's pipeline stage from what we know about them.

    applied    -> uploaded / created, not yet screened
    screened   -> has an AI match score
    onboarding -> onboarding record is pending or in progress
    hired      -> onboarding completed
    rejected   -> onboarding rejected
    """
    status = (onboarding_status or "").lower()
    if status == "completed":
        return "hired"
    if status == "rejected":
        return "rejected"
    if status in {"pending", "in_progress", "created"}:
        return "onboarding"
    return "screened" if has_score else "applied"
