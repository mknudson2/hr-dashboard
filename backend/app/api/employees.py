from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import models, database

router = APIRouter(prefix="/employees", tags=["employees"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def list_employees(db: Session = Depends(get_db)):
    """Return all employees with basic HR info."""
    employees = db.query(models.Employee).all()

    formatted = [
        {
            "id": e.id,
            "name": f"{e.first_name or ''} {e.last_name or ''}".strip(),
            "status": e.status,
            "role": e.type,
            "department": e.department,
            "cost_center": e.cost_center,
            "hire_date": e.hire_date.isoformat() if e.hire_date else None,
            "termination_date": e.termination_date.isoformat() if e.termination_date else None,
            "wage": e.wage,
            "tenure_years": e.tenure_years,
            "pto_used": e.pto_used,
            "pto_allotted": e.pto_allotted,
            "attendance_days": e.attendance_days,
            "expected_days": e.expected_days,
        }
        for e in employees
    ]

    return formatted


@router.get("/{employee_id}")
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get a single employee by ID."""
    e = db.query(models.Employee).filter(
        models.Employee.id == employee_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {
        "id": e.id,
        "employee_id": e.employee_id,
        "name": f"{e.first_name or ''} {e.last_name or ''}".strip(),
        "status": e.status,
        "type": e.type,
        "department": e.department,
        "cost_center": e.cost_center,
        "hire_date": e.hire_date.isoformat() if e.hire_date else None,
        "termination_date": e.termination_date.isoformat() if e.termination_date else None,
        "wage": e.wage,
        "benefits_cost": e.benefits_cost,
        "tenure_years": e.tenure_years,
        "pto_used": e.pto_used,
        "pto_allotted": e.pto_allotted,
        "attendance_days": e.attendance_days,
        "expected_days": e.expected_days,
    }


@router.put("/{employee_id}/pto")
def update_pto(employee_id: int, pto_used: float, db: Session = Depends(get_db)):
    """Update an employee’s PTO used amount."""
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.pto_used = pto_used
    db.commit()
    db.refresh(employee)
    return {"message": "PTO updated successfully", "pto_used": employee.pto_used}


@router.put("/{employee_id}/attendance")
def update_attendance(employee_id: int, attendance_days: float, db: Session = Depends(get_db)):
    """Update an employee’s attendance days."""
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.attendance_days = attendance_days
    db.commit()
    db.refresh(employee)
    return {"message": "Attendance updated successfully", "attendance_days": employee.attendance_days}
