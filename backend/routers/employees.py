import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from backend.models.models import (
    Attendance,
    Employee,
    Payroll,
    PerformanceReview,
    User,
)
from backend.schemas.schemas import EmployeeCreate, EmployeeUpdate
from backend.services.auth_service import (
    admin_only,
    get_current_user,
    hash_password,
)

router = APIRouter()


def serialize(employee: Employee) -> dict:
    return {
        "id": employee.id,
        "name": employee.name,
        "email": employee.email,
        "department": employee.department,
        "designation": employee.designation,
        "salary": employee.salary,
        "joining_date": employee.joining_date,
    }


@router.post("", status_code=201)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    email = payload.email.strip().lower()

    if db.query(Employee).filter(Employee.email == email).first():
        raise HTTPException(
            status_code=400,
            detail="An employee with this email already exists.",
        )

    data = payload.model_dump()
    data["email"] = email
    employee = Employee(**data)
    db.add(employee)

    # Create a login for the employee if they do not have one yet.
    temp_password = None
    if not db.query(User).filter(User.email == email).first():
        temp_password = secrets.token_urlsafe(8)
        db.add(
            User(
                name=payload.name,
                email=email,
                password_hash=hash_password(temp_password),
                role="employee",
            )
        )

    db.commit()
    db.refresh(employee)

    return {
        "message": "Employee created successfully",
        # Shown once to the admin so they can hand it over. None if the person already had an account.
        "default_password": temp_password,
        "employee": serialize(employee),
    }


@router.get("")
def list_employees(
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employees = db.query(Employee).order_by(Employee.name.asc()).all()
    return [serialize(e) for e in employees]


# NOTE: "/me" must be declared before "/{employee_id}".
@router.get("/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(Employee.email == str(current_user.get("sub", "")).lower())
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Your account is not linked to an employee record yet. Please ask an administrator to add you.",
        )
    return serialize(employee)


@router.get("/{employee_id}")
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return serialize(employee)


@router.put("/{employee_id}")
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return serialize(employee)


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(admin_only),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    db.query(Attendance).filter(Attendance.employee_id == employee_id).delete()
    db.query(Payroll).filter(Payroll.employee_id == employee_id).delete()
    db.query(PerformanceReview).filter(PerformanceReview.employee_id == employee_id).delete()
    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted"}
