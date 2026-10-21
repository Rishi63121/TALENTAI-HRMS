from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import Employee, Payroll
from backend.schemas.schemas import PayrollCreate
from backend.services.auth_service import admin_only, get_current_user

router = APIRouter()


def _serialize(record: Payroll, name: str) -> dict:
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "employee_name": name,
        "month": record.month,
        "basic_salary": record.basic_salary,
        "bonus": record.bonus,
        "deductions": record.deductions,
        "net_salary": record.net_salary,
    }


@router.post("")
def create_payroll(
    payload: PayrollCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employee = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if min(payload.basic_salary, payload.bonus, payload.deductions) < 0:
        raise HTTPException(status_code=422, detail="Salary, bonus and deductions cannot be negative.")

    net_salary = payload.basic_salary + payload.bonus - payload.deductions

    # One payslip per employee per month: re-running payroll updates it instead of duplicating.
    record = (
        db.query(Payroll)
        .filter(Payroll.employee_id == payload.employee_id, Payroll.month == payload.month)
        .first()
    )
    if record:
        record.basic_salary = payload.basic_salary
        record.bonus = payload.bonus
        record.deductions = payload.deductions
        record.net_salary = net_salary
    else:
        record = Payroll(
            employee_id=payload.employee_id,
            basic_salary=payload.basic_salary,
            bonus=payload.bonus,
            deductions=payload.deductions,
            net_salary=net_salary,
            month=payload.month,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return _serialize(record, employee.name)


@router.get("")
def get_payroll(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    query = db.query(Payroll, Employee.name).outerjoin(Employee, Employee.id == Payroll.employee_id)
    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)

    rows = query.order_by(Payroll.id.desc()).all()
    return [_serialize(record, name or "Unknown") for record, name in rows]


@router.get("/my")
def get_my_payroll(
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

    records = (
        db.query(Payroll)
        .filter(Payroll.employee_id == employee.id)
        .order_by(Payroll.id.desc())
        .all()
    )
    return [_serialize(r, employee.name) for r in records]
