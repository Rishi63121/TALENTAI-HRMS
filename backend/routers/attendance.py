from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import Attendance, Employee
from backend.schemas.schemas import AttendanceCreate
from backend.services.auth_service import admin_only, get_current_user

router = APIRouter()

VALID_STATUSES = {"Present", "Absent", "WFH", "Leave"}
SELF_CHECKIN_STATUSES = {"Present", "WFH"}


class CheckInRequest(BaseModel):
    status: Optional[str] = "Present"


def _normalize_status(value: str) -> str:
    match = next((s for s in VALID_STATUSES if s.lower() == str(value).strip().lower()), None)
    if not match:
        raise HTTPException(
            status_code=422,
            detail=f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}.",
        )
    return match


def _day_bounds(moment: datetime):
    start = moment.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def _upsert_today(db: Session, employee_id: int, status: str) -> Attendance:
    start, end = _day_bounds(datetime.utcnow())
    record = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= start,
            Attendance.date < end,
        )
        .first()
    )
    if record:
        record.status = status
    else:
        record = Attendance(employee_id=employee_id, status=status)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _serialize(record: Attendance, name: str) -> dict:
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "employee_name": name,
        "date": record.date,
        "status": record.status,
    }


def _employee_for(db: Session, current_user: dict) -> Optional[Employee]:
    return (
        db.query(Employee)
        .filter(Employee.email == str(current_user.get("sub", "")).lower())
        .first()
    )


@router.post("")
def mark_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employee = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    record = _upsert_today(db, employee.id, _normalize_status(payload.status))
    return {"message": "Attendance marked successfully", "record": _serialize(record, employee.name)}


@router.post("/check-in")
def check_in(
    payload: CheckInRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Let an employee mark themselves present (or working from home) for today."""
    employee = _employee_for(db, current_user)
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Your account is not linked to an employee record yet. Please ask an administrator to add you.",
        )
    status = _normalize_status(payload.status or "Present")
    if status not in SELF_CHECKIN_STATUSES:
        raise HTTPException(status_code=403, detail="You can only check in as Present or WFH.")

    record = _upsert_today(db, employee.id, status)
    return {"message": "Checked in", "record": _serialize(record, employee.name)}


@router.get("")
def get_attendance(
    employee_id: Optional[int] = None,
    limit: int = 500,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    query = db.query(Attendance, Employee.name).outerjoin(
        Employee, Employee.id == Attendance.employee_id
    )
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    rows = query.order_by(Attendance.date.desc()).limit(max(1, min(limit, 2000))).all()
    return [_serialize(record, name or "Unknown") for record, name in rows]


@router.get("/my")
def get_my_attendance(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = _employee_for(db, current_user)
    if not employee:
        return []

    records = (
        db.query(Attendance)
        .filter(Attendance.employee_id == employee.id)
        .order_by(Attendance.date.desc())
        .all()
    )
    return [_serialize(r, employee.name) for r in records]
