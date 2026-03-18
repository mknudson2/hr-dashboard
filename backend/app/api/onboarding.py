from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, date, timedelta
from typing import List, Optional
from pydantic import BaseModel
from app.db import models, database
from app.api.auth import get_current_user
from app.api.settings import create_employee_folder

router = APIRouter(
    prefix="/onboarding",
    tags=["onboarding"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class OnboardingTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: Optional[str] = None
    role_type: Optional[str] = None
    is_active: bool = True
    is_default: bool = False
    duration_days: int = 90
    auto_assign: bool = True
    send_welcome_email: bool = True
    welcome_email_template: Optional[str] = None
    created_by: Optional[str] = None


class NewEmployeeData(BaseModel):
    first_name: str
    last_name: str
    department: str
    position: Optional[str] = None
    hire_date: str
    location: Optional[str] = None
    wage: Optional[float] = None
    wage_type: str = "Salary"


class OnboardingTaskCreate(BaseModel):
    employee_id: str
    template_id: Optional[int] = None
    task_name: str
    task_description: Optional[str] = None
    category: str
    assigned_to: Optional[str] = None
    assigned_to_role: Optional[str] = None
    due_date: Optional[date] = None
    days_from_start: Optional[int] = None
    priority: str = "Medium"
    notes: Optional[str] = None


class OnboardingTaskUpdate(BaseModel):
    status: Optional[str] = None
    completion_notes: Optional[str] = None
    completed_by: Optional[str] = None
    completed_date: Optional[date] = None
    notes: Optional[str] = None
    task_details: Optional[dict] = None


# ============================================================================
# Onboarding Templates Endpoints
# ============================================================================

@router.get("/templates")
def get_onboarding_templates(db: Session = Depends(database.get_db)):
    """Get all onboarding templates"""
    templates = db.query(models.OnboardingTemplate).all()
    return {"templates": templates, "total": len(templates)}


@router.post("/templates")
def create_onboarding_template(template_data: OnboardingTemplateCreate, db: Session = Depends(database.get_db)):
    """Create a new onboarding template"""
    # Generate template ID
    count = db.query(models.OnboardingTemplate).count()
    template_id = f"OB-TEMPLATE-{str(count + 1).zfill(3)}"

    new_template = models.OnboardingTemplate(
        template_id=template_id,
        name=template_data.name,
        description=template_data.description,
        department=template_data.department,
        role_type=template_data.role_type,
        is_active=template_data.is_active,
        is_default=template_data.is_default,
        duration_days=template_data.duration_days,
        auto_assign=template_data.auto_assign,
        send_welcome_email=template_data.send_welcome_email,
        welcome_email_template=template_data.welcome_email_template,
        created_by=template_data.created_by,
        created_at=datetime.now()
    )

    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return {
        "id": new_template.id,
        "template_id": new_template.template_id,
        "name": new_template.name,
        "message": "Onboarding template created successfully"
    }


# ============================================================================
# Onboarding Tasks Endpoints
# ============================================================================

@router.get("/tasks")
def get_onboarding_tasks(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get onboarding tasks with optional filters"""
    query = db.query(models.OnboardingTask)

    if employee_id:
        query = query.filter(models.OnboardingTask.employee_id == employee_id)

    if status:
        query = query.filter(models.OnboardingTask.status == status)

    tasks = query.order_by(models.OnboardingTask.due_date.asc()).all()

    return {"tasks": tasks, "total": len(tasks)}


@router.post("/tasks")
def create_onboarding_task(task_data: OnboardingTaskCreate, db: Session = Depends(database.get_db)):
    """Create a new onboarding task"""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == task_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate task ID
    year = datetime.now().year
    count = db.query(models.OnboardingTask).filter(
        models.OnboardingTask.task_id.like(f"OB-TASK-{year}-%")
    ).count()
    task_id = f"OB-TASK-{year}-{str(count + 1).zfill(4)}"

    # Calculate due date if days_from_start is provided
    due_date = task_data.due_date
    if task_data.days_from_start is not None and employee.hire_date:
        due_date = employee.hire_date + timedelta(days=task_data.days_from_start)

    new_task = models.OnboardingTask(
        task_id=task_id,
        employee_id=task_data.employee_id,
        template_id=task_data.template_id,
        task_name=task_data.task_name,
        task_description=task_data.task_description,
        category=task_data.category,
        assigned_to=task_data.assigned_to,
        assigned_to_role=task_data.assigned_to_role,
        due_date=due_date,
        days_from_start=task_data.days_from_start,
        priority=task_data.priority,
        status="Not Started",
        notes=task_data.notes,
        created_at=datetime.now()
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return {
        "id": new_task.id,
        "task_id": new_task.task_id,
        "employee_id": new_task.employee_id,
        "task_name": new_task.task_name,
        "message": "Onboarding task created successfully"
    }


@router.patch("/tasks/{task_id}")
def update_onboarding_task(
    task_id: int,
    task_update: OnboardingTaskUpdate,
    db: Session = Depends(database.get_db)
):
    """Update an onboarding task"""
    task = db.query(models.OnboardingTask).filter(models.OnboardingTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    if task_update.status is not None:
        task.status = task_update.status
        # If marking as completed, set completed_date
        if task_update.status == "Completed" and task.completed_date is None:
            task.completed_date = datetime.now().date()

    if task_update.completion_notes is not None:
        task.completion_notes = task_update.completion_notes

    if task_update.completed_by is not None:
        task.completed_by = task_update.completed_by

    if task_update.completed_date is not None:
        task.completed_date = task_update.completed_date

    if task_update.notes is not None:
        task.notes = task_update.notes

    if task_update.task_details is not None:
        task.task_details = task_update.task_details

    task.updated_at = datetime.now()

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "task_id": task.task_id,
        "status": task.status,
        "message": "Task updated successfully"
    }


@router.get("/dashboard")
def get_onboarding_dashboard(db: Session = Depends(database.get_db)):
    """Get onboarding dashboard statistics"""

    # Active onboarding (employees hired in last 90 days)
    ninety_days_ago = datetime.now().date() - timedelta(days=90)

    active_onboarding = db.query(models.Employee).filter(
        models.Employee.hire_date >= ninety_days_ago,
        models.Employee.status == "Active"
    ).count()

    # Tasks by status
    total_tasks = db.query(models.OnboardingTask).count()
    completed_tasks = db.query(models.OnboardingTask).filter(
        models.OnboardingTask.status == "Completed"
    ).count()
    in_progress_tasks = db.query(models.OnboardingTask).filter(
        models.OnboardingTask.status == "In Progress"
    ).count()
    overdue_tasks = db.query(models.OnboardingTask).filter(
        models.OnboardingTask.status != "Completed",
        models.OnboardingTask.due_date < datetime.now().date()
    ).count()

    # Recent new hires
    recent_hires = db.query(models.Employee).filter(
        models.Employee.hire_date >= ninety_days_ago,
        models.Employee.status == "Active"
    ).order_by(models.Employee.hire_date.desc()).limit(10).all()

    # Calculate completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "active_onboarding": active_onboarding,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate": round(completion_rate, 1),
        "recent_hires": recent_hires
    }


@router.post("/tasks/bulk-create")
def bulk_create_tasks_from_template(
    employee_data: NewEmployeeData,
    template_id: int,
    db: Session = Depends(database.get_db)
):
    """Create a new employee and onboarding tasks from a template"""
    from datetime import datetime as dt

    # Generate new employee ID (find highest numeric ID and increment)
    max_id_result = db.execute(
        text("SELECT MAX(CAST(employee_id AS INTEGER)) FROM employees WHERE employee_id GLOB '[0-9]*'")
    ).fetchone()
    next_id = (max_id_result[0] or 1000) + 1
    employee_id = str(next_id)

    # Create new employee record
    new_employee = models.Employee(
        employee_id=employee_id,
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        department=employee_data.department,
        position=employee_data.position,
        hire_date=dt.strptime(employee_data.hire_date, "%Y-%m-%d").date(),
        location=employee_data.location,
        status="Active",
        type="FT",  # Default to Full Time
        wage=employee_data.wage or 0,
        wage_type=employee_data.wage_type
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    employee = new_employee

    # Verify template exists (optional - create default if it doesn't exist)
    template = db.query(models.OnboardingTemplate).filter(
        models.OnboardingTemplate.id == template_id
    ).first()
    if not template:
        # Create default template if it doesn't exist
        default_template = models.OnboardingTemplate(
            template_id="OB-TEMPLATE-001",
            name="Standard Onboarding",
            description="Default onboarding template for new hires",
            is_default=True,
            is_active=True,
            duration_days=90,
            auto_assign=True,
            send_welcome_email=True,
            created_at=datetime.now()
        )
        db.add(default_template)
        db.commit()
        db.refresh(default_template)
        template = default_template

    # Here you would typically have template tasks to create from
    # For now, we'll create a standard set of onboarding tasks
    standard_tasks = [
        {"name": "Send welcome email", "category": "HR", "days": -1, "role": "HR Manager", "priority": "High"},
        {"name": "Prepare workstation", "category": "IT", "days": -1, "role": "IT Admin", "priority": "High"},
        {"name": "Assign equipment", "category": "IT", "days": 0, "role": "IT Admin", "priority": "High"},
        {"name": "Complete I-9 form", "category": "HR", "days": 0, "role": "New Hire", "priority": "Critical"},
        {"name": "Review company policies", "category": "HR", "days": 0, "role": "New Hire", "priority": "High"},
        {"name": "Setup email and accounts", "category": "IT", "days": 0, "role": "IT Admin", "priority": "High"},
        {"name": "Team introduction meeting", "category": "Manager", "days": 0, "role": "Direct Manager", "priority": "High"},
        {"name": "Benefits enrollment", "category": "HR", "days": 7, "role": "New Hire", "priority": "High"},
        {"name": "30-day check-in", "category": "Manager", "days": 30, "role": "Direct Manager", "priority": "Medium"},
        {"name": "60-day review", "category": "Manager", "days": 60, "role": "Direct Manager", "priority": "Medium"},
        {"name": "90-day review", "category": "Manager", "days": 90, "role": "Direct Manager", "priority": "High"},
    ]

    created_tasks = []
    year = datetime.now().year

    # Get initial count once before loop to prevent UNIQUE constraint errors
    initial_count = db.query(models.OnboardingTask).filter(
        models.OnboardingTask.task_id.like(f"OB-TASK-{year}-%")
    ).count()

    for idx, task_template in enumerate(standard_tasks):
        task_id = f"OB-TASK-{year}-{str(initial_count + idx + 1).zfill(4)}"

        due_date = None
        if employee.hire_date and task_template["days"] is not None:
            due_date = employee.hire_date + timedelta(days=task_template["days"])

        new_task = models.OnboardingTask(
            task_id=task_id,
            employee_id=employee_id,
            template_id=template_id,
            task_name=task_template["name"],
            category=task_template["category"],
            assigned_to_role=task_template["role"],
            due_date=due_date,
            days_from_start=task_template["days"],
            priority=task_template["priority"],
            status="Not Started",
            created_at=datetime.now()
        )

        db.add(new_task)
        created_tasks.append(task_template["name"])

    db.commit()

    # Create employee folder if enabled in settings
    folder_result = create_employee_folder(
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        state=employee_data.location
    )

    return {
        "message": f"Created {len(created_tasks)} onboarding tasks for {employee.first_name} {employee.last_name}",
        "employee_id": employee_id,
        "tasks_created": len(created_tasks),
        "task_names": created_tasks,
        "folder_created": folder_result.get("created", False),
        "folder_path": folder_result.get("folder_path"),
        "folder_subfolders": folder_result.get("subfolders", [])
    }
