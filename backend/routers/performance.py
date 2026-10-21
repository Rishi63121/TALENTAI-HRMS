from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import Employee, PerformanceReview
from backend.schemas.schemas import PerformanceCreate
from backend.services.auth_service import admin_only, get_current_user

router = APIRouter()


def _serialize(review: PerformanceReview, name: str) -> dict:
    return {
        "id": review.id,
        "employee_id": review.employee_id,
        "employee_name": name,
        "rating": review.rating,
        "comments": review.comments,
        "created_at": review.created_at,
    }


def _validate_rating(rating: int) -> None:
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5.")


@router.post("")
def add_review(
    payload: PerformanceCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employee = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")
    _validate_rating(payload.rating)

    review = PerformanceReview(
        employee_id=payload.employee_id,
        rating=payload.rating,
        comments=payload.comments,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _serialize(review, employee.name)


@router.put("/{review_id}")
def update_review(
    review_id: int,
    payload: PerformanceCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    _validate_rating(payload.rating)

    employee = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    review.employee_id = payload.employee_id
    review.rating = payload.rating
    review.comments = payload.comments
    db.commit()
    db.refresh(review)
    return {"message": "Review updated successfully", "review": _serialize(review, employee.name)}


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    review = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    db.delete(review)
    db.commit()
    return {"message": "Review deleted successfully"}


@router.get("")
def get_reviews(
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    rows = (
        db.query(PerformanceReview, Employee.name)
        .outerjoin(Employee, Employee.id == PerformanceReview.employee_id)
        .order_by(PerformanceReview.created_at.desc())
        .all()
    )
    return [_serialize(review, name or "Unknown") for review, name in rows]


@router.get("/my")
def get_my_reviews(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(Employee.email == str(current_user.get("sub", "")).lower())
        .first()
    )
    if not employee:
        return []

    reviews = (
        db.query(PerformanceReview)
        .filter(PerformanceReview.employee_id == employee.id)
        .order_by(PerformanceReview.created_at.desc())
        .all()
    )
    return [_serialize(r, employee.name) for r in reviews]
