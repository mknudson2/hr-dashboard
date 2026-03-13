import logging
import json
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import List, Optional
from pydantic import BaseModel
from app.db import models, database
from app.api.auth import get_current_user
from app.services.email_service import email_service
from app.services.offboarding_pdf_service import offboarding_pdf_service
from app.services.exit_document_service import exit_document_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/offboarding",
    tags=["offboarding"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


# ============================================================================
# Pydantic Schemas
# ============================================================================

class OffboardingTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    termination_type: Optional[str] = None
    department: Optional[str] = None
    role_type: Optional[str] = None
    is_active: bool = True
    is_default: bool = False
    duration_days: int = 30
    auto_assign: bool = True
    require_exit_interview: bool = True
    exit_interview_template: Optional[str] = None
    created_by: Optional[str] = None


class OffboardingTaskCreate(BaseModel):
    employee_id: str
    template_id: Optional[int] = None
    task_name: str
    task_description: Optional[str] = None
    category: str
    assigned_to: Optional[str] = None
    assigned_to_role: Optional[str] = None
    due_date: Optional[date] = None
    days_from_termination: Optional[int] = None
    priority: str = "Medium"
    notes: Optional[str] = None


class OffboardingTaskUpdate(BaseModel):
    status: Optional[str] = None
    completion_notes: Optional[str] = None
    completed_by: Optional[str] = None
    completed_date: Optional[str] = None  # ISO 8601 timestamp string
    notes: Optional[str] = None
    add_note: Optional[str] = None  # Add a new note to history
    task_details: Optional[dict] = None
    uncheck_history: Optional[dict] = None  # Single uncheck event to append


class ExitInterviewCreate(BaseModel):
    employee_id: str
    interview_date: Optional[date] = None
    interviewer: Optional[str] = None
    termination_date: Optional[date] = None
    primary_reason: Optional[str] = None
    overall_satisfaction: Optional[int] = None
    job_satisfaction: Optional[int] = None
    management_satisfaction: Optional[int] = None
    work_environment_satisfaction: Optional[int] = None
    compensation_satisfaction: Optional[int] = None
    benefits_satisfaction: Optional[int] = None
    work_life_balance_satisfaction: Optional[int] = None
    career_development_satisfaction: Optional[int] = None
    what_did_you_like: Optional[str] = None
    what_could_improve: Optional[str] = None
    why_leaving: Optional[str] = None
    manager_feedback: Optional[str] = None
    would_recommend: Optional[bool] = None
    would_return: Optional[bool] = None
    additional_comments: Optional[str] = None
    new_company_name: Optional[str] = None
    new_role_title: Optional[str] = None


# ============================================================================
# Offboarding Templates Endpoints
# ============================================================================

@router.get("/templates")
def get_offboarding_templates(db: Session = Depends(database.get_db)):
    """Get all offboarding templates"""
    templates = db.query(models.OffboardingTemplate).all()
    return {"templates": templates, "total": len(templates)}


@router.post("/templates")
def create_offboarding_template(template_data: OffboardingTemplateCreate, db: Session = Depends(database.get_db)):
    """Create a new offboarding template"""
    # Generate template ID
    count = db.query(models.OffboardingTemplate).count()
    template_id = f"OFF-TEMPLATE-{str(count + 1).zfill(3)}"

    new_template = models.OffboardingTemplate(
        template_id=template_id,
        name=template_data.name,
        description=template_data.description,
        termination_type=template_data.termination_type,
        department=template_data.department,
        role_type=template_data.role_type,
        is_active=template_data.is_active,
        is_default=template_data.is_default,
        duration_days=template_data.duration_days,
        auto_assign=template_data.auto_assign,
        require_exit_interview=template_data.require_exit_interview,
        exit_interview_template=template_data.exit_interview_template,
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
        "message": "Offboarding template created successfully"
    }


# ============================================================================
# Offboarding Tasks Endpoints
# ============================================================================

@router.get("/tasks")
def get_offboarding_tasks(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    include_archived: bool = False,
    db: Session = Depends(database.get_db)
):
    """Get offboarding tasks with optional filters

    By default, excludes archived tasks (archived=True).
    Set include_archived=True to include archived tasks.

    Returns parent tasks with nested subtasks.
    """
    query = db.query(models.OffboardingTask)

    # Exclude archived tasks by default
    if not include_archived:
        query = query.filter(
            (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
        )

    if employee_id:
        query = query.filter(models.OffboardingTask.employee_id == employee_id)

    if status:
        # Handle special filter values
        if status == "Active (Not Completed)":
            query = query.filter(models.OffboardingTask.status != "Completed")
        elif status == "All":
            pass  # No status filter
        else:
            query = query.filter(models.OffboardingTask.status == status)

    # Only get parent tasks and standalone tasks (exclude subtasks from main list)
    query = query.filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None)
    )

    tasks = query.order_by(models.OffboardingTask.due_date.asc()).all()

    # Build response with subtasks nested under parent tasks
    result = []
    for task in tasks:
        task_dict = {
            "id": task.id,
            "task_id": task.task_id,
            "employee_id": task.employee_id,
            "task_name": task.task_name,
            "task_description": task.task_description,
            "category": task.category,
            "assigned_to": task.assigned_to,
            "assigned_to_role": task.assigned_to_role,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "status": task.status,
            "priority": task.priority,
            "completed_date": task.completed_date,
            "days_from_termination": task.days_from_termination,
            "notes": task.notes,
            "notes_history": task.notes_history,
            "completion_notes": task.completion_notes,
            "completed_by": task.completed_by,
            "task_details": task.task_details,
            "uncheck_history": task.uncheck_history,
            "parent_task_id": task.parent_task_id,
            "has_subtasks": task.has_subtasks,
            "is_subtask": task.is_subtask,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        }

        # If task has subtasks, fetch and nest them
        if task.has_subtasks:
            subtasks = db.query(models.OffboardingTask).filter(
                models.OffboardingTask.parent_task_id == task.id
            ).order_by(models.OffboardingTask.id.asc()).all()

            task_dict["subtasks"] = [
                {
                    "id": st.id,
                    "task_id": st.task_id,
                    "employee_id": st.employee_id,
                    "task_name": st.task_name,
                    "task_description": st.task_description,
                    "category": st.category,
                    "assigned_to": st.assigned_to,
                    "assigned_to_role": st.assigned_to_role,
                    "due_date": st.due_date.isoformat() if st.due_date else None,
                    "status": st.status,
                    "priority": st.priority,
                    "completed_date": st.completed_date,
                    "days_from_termination": st.days_from_termination,
                    "notes": st.notes,
                    "notes_history": st.notes_history,
                    "completion_notes": st.completion_notes,
                    "completed_by": st.completed_by,
                    "task_details": st.task_details,
                    "parent_task_id": st.parent_task_id,
                    "has_subtasks": st.has_subtasks,
                    "is_subtask": st.is_subtask,
                    "created_at": st.created_at.isoformat() if st.created_at else None,
                    "updated_at": st.updated_at.isoformat() if st.updated_at else None,
                }
                for st in subtasks
            ]

        result.append(task_dict)

    return {"tasks": result, "total": len(result)}


@router.post("/tasks")
def create_offboarding_task(task_data: OffboardingTaskCreate, db: Session = Depends(database.get_db)):
    """Create a new offboarding task"""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == task_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate task ID
    year = datetime.now().year
    count = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
    ).count()
    task_id = f"OFF-TASK-{year}-{str(count + 1).zfill(4)}"

    # Calculate due date if days_from_termination is provided
    due_date = task_data.due_date
    if task_data.days_from_termination is not None and employee.termination_date:
        due_date = employee.termination_date + timedelta(days=task_data.days_from_termination)

    new_task = models.OffboardingTask(
        task_id=task_id,
        employee_id=task_data.employee_id,
        template_id=task_data.template_id,
        task_name=task_data.task_name,
        task_description=task_data.task_description,
        category=task_data.category,
        assigned_to=task_data.assigned_to,
        assigned_to_role=task_data.assigned_to_role,
        due_date=due_date,
        days_from_termination=task_data.days_from_termination,
        priority=task_data.priority,
        status="Not Started",
        notes=task_data.notes,
        created_at=datetime.now()
    )

    db.add(new_task)

    # Automatically set employee status to "Terminated" when offboarding tasks are created
    if employee.status != "Terminated":
        employee.status = "Terminated"

    db.commit()
    db.refresh(new_task)

    return {
        "id": new_task.id,
        "task_id": new_task.task_id,
        "employee_id": new_task.employee_id,
        "task_name": new_task.task_name,
        "message": "Offboarding task created successfully"
    }


@router.patch("/tasks/{task_id}")
def update_offboarding_task(
    task_id: int,
    task_update: OffboardingTaskUpdate,
    db: Session = Depends(database.get_db)
):
    """Update an offboarding task"""
    task = db.query(models.OffboardingTask).filter(models.OffboardingTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    if task_update.status is not None:
        task.status = task_update.status
        # If status is changed to non-Completed, clear the completed_date
        if task_update.status != 'Completed':
            task.completed_date = None

    if task_update.completion_notes is not None:
        task.completion_notes = task_update.completion_notes

    if task_update.completed_by is not None:
        task.completed_by = task_update.completed_by

    # completed_date can be set explicitly (for Completed) or will be cleared automatically above
    if task_update.completed_date is not None:
        task.completed_date = task_update.completed_date

    if task_update.notes is not None:
        task.notes = task_update.notes

    # Handle adding a new note to history
    if task_update.add_note is not None:
        if task.notes_history is None:
            task.notes_history = []
        else:
            if not isinstance(task.notes_history, list):
                task.notes_history = []

        # Create new note entry
        note_entry = {
            "note": task_update.add_note,
            "timestamp": datetime.now().isoformat(),
            "created_by": "User"
        }
        task.notes_history.append(note_entry)

        # Also update the 'notes' field with the latest note for backward compatibility
        task.notes = task_update.add_note

    if task_update.task_details is not None:
        task.task_details = task_update.task_details

    # Handle uncheck history - append to array
    if task_update.uncheck_history is not None:
        if task.uncheck_history is None:
            task.uncheck_history = []
        else:
            # Ensure it's a list
            if not isinstance(task.uncheck_history, list):
                task.uncheck_history = []

        # Append the new uncheck event
        task.uncheck_history.append(task_update.uncheck_history)

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
def get_offboarding_dashboard(db: Session = Depends(database.get_db)):
    """Get offboarding dashboard statistics"""

    # Active offboarding - count employees with incomplete (not all completed) offboarding tasks
    # Get all employees with offboarding tasks that are not archived
    employees_with_tasks = db.query(models.OffboardingTask.employee_id).filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
        (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
    ).distinct().all()

    active_offboarding = 0
    for (emp_id,) in employees_with_tasks:
        # Check if this employee has any incomplete tasks
        incomplete_count = db.query(models.OffboardingTask).filter(
            models.OffboardingTask.employee_id == emp_id,
            (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
            models.OffboardingTask.status != "Completed",
            (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
        ).count()
        if incomplete_count > 0:
            active_offboarding += 1

    # Tasks by status - only count parent tasks (is_subtask is False or NULL) that are not archived
    total_tasks = db.query(models.OffboardingTask).filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
        (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
    ).count()
    completed_tasks = db.query(models.OffboardingTask).filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
        models.OffboardingTask.status == "Completed",
        (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
    ).count()
    in_progress_tasks = db.query(models.OffboardingTask).filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
        models.OffboardingTask.status == "In Progress",
        (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
    ).count()
    overdue_tasks = db.query(models.OffboardingTask).filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
        models.OffboardingTask.status != "Completed",
        models.OffboardingTask.due_date < datetime.now().date(),
        (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
    ).count()

    # Exit interviews - track the lifecycle:
    # 1. Pending (not scheduled) = "Schedule Exit Interview" is NOT completed
    # 2. Scheduled (scheduled but not held) = "Schedule Exit Interview" IS completed BUT "Hold Exit Interview" is NOT completed
    # 3. Completed/Held = "Hold Exit Interview" IS completed (removed from counts)

    # Get all employees with exit interview tasks
    employees_with_exit_interviews = db.query(models.OffboardingTask.employee_id).filter(
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
        models.OffboardingTask.task_name.ilike('%exit interview%'),
        (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
    ).distinct().all()

    exit_interviews_scheduled = 0  # Scheduled but not held
    exit_interviews_pending = 0    # Not yet scheduled

    for (emp_id,) in employees_with_exit_interviews:
        # Get both schedule and hold tasks for this employee
        schedule_task = db.query(models.OffboardingTask).filter(
            models.OffboardingTask.employee_id == emp_id,
            (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
            models.OffboardingTask.task_name.ilike('%schedule exit interview%'),
            (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
        ).first()

        hold_task = db.query(models.OffboardingTask).filter(
            models.OffboardingTask.employee_id == emp_id,
            (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None),
            models.OffboardingTask.task_name.ilike('%hold exit interview%'),
            (models.OffboardingTask.archived == False) | (models.OffboardingTask.archived == None)
        ).first()

        # If "Hold Exit Interview" is completed, don't count (interview is done)
        if hold_task and hold_task.status == "Completed":
            continue

        # If "Schedule" is completed but "Hold" is not, it's scheduled
        if schedule_task and schedule_task.status == "Completed":
            exit_interviews_scheduled += 1
        # If "Schedule" is not completed, it's pending
        elif schedule_task and schedule_task.status != "Completed":
            exit_interviews_pending += 1

    # Recent terminations (last 30 days)
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    recent_terminations = db.query(models.Employee).filter(
        models.Employee.termination_date >= thirty_days_ago,
        models.Employee.status == "Terminated"
    ).order_by(models.Employee.termination_date.desc()).limit(10).all()

    # Calculate completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "active_offboarding": active_offboarding,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate": round(completion_rate, 1),
        "exit_interviews_completed": exit_interviews_scheduled,
        "exit_interviews_pending": exit_interviews_pending,
        "recent_terminations": recent_terminations
    }


# ============================================================================
# Exit Interview Endpoints
# ============================================================================

@router.get("/exit-interviews")
def get_exit_interviews(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Get exit interviews with optional filters"""
    query = db.query(models.ExitInterview)

    if employee_id:
        query = query.filter(models.ExitInterview.employee_id == employee_id)

    if status:
        query = query.filter(models.ExitInterview.status == status)

    interviews = query.order_by(models.ExitInterview.interview_date.desc()).all()

    return {"exit_interviews": interviews, "total": len(interviews)}


@router.post("/exit-interviews")
def create_exit_interview(interview_data: ExitInterviewCreate, db: Session = Depends(database.get_db)):
    """Create a new exit interview"""
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == interview_data.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate interview ID
    year = datetime.now().year
    count = db.query(models.ExitInterview).filter(
        models.ExitInterview.interview_id.like(f"EXIT-{year}-%")
    ).count()
    interview_id = f"EXIT-{year}-{str(count + 1).zfill(4)}"

    new_interview = models.ExitInterview(
        interview_id=interview_id,
        employee_id=interview_data.employee_id,
        interview_date=interview_data.interview_date,
        interviewer=interview_data.interviewer,
        termination_date=interview_data.termination_date or employee.termination_date,
        status="Completed" if interview_data.interview_date else "Pending",
        primary_reason=interview_data.primary_reason,
        overall_satisfaction=interview_data.overall_satisfaction,
        job_satisfaction=interview_data.job_satisfaction,
        management_satisfaction=interview_data.management_satisfaction,
        work_environment_satisfaction=interview_data.work_environment_satisfaction,
        compensation_satisfaction=interview_data.compensation_satisfaction,
        benefits_satisfaction=interview_data.benefits_satisfaction,
        work_life_balance_satisfaction=interview_data.work_life_balance_satisfaction,
        career_development_satisfaction=interview_data.career_development_satisfaction,
        what_did_you_like=interview_data.what_did_you_like,
        what_could_improve=interview_data.what_could_improve,
        why_leaving=interview_data.why_leaving,
        manager_feedback=interview_data.manager_feedback,
        would_recommend=interview_data.would_recommend,
        would_return=interview_data.would_return,
        additional_comments=interview_data.additional_comments,
        new_company_name=interview_data.new_company_name,
        new_role_title=interview_data.new_role_title,
        created_at=datetime.now()
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return {
        "id": new_interview.id,
        "interview_id": new_interview.interview_id,
        "employee_id": new_interview.employee_id,
        "message": "Exit interview created successfully"
    }


@router.post("/tasks/bulk-create")
def bulk_create_offboarding_tasks(
    employee_id: str,
    template_id: int,
    termination_date: str,
    employment_type: str = "Full Time",
    termination_type: str = "Voluntary",
    db: Session = Depends(database.get_db)
):
    """
    Create all offboarding tasks for an employee from a template

    Args:
        employee_id: Employee ID
        template_id: Template ID (typically 1 for default)
        termination_date: Last day of work
        employment_type: Full Time, Part Time, or International
        termination_type: Voluntary or Involuntary
    """
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Verify template exists
    template = db.query(models.OffboardingTemplate).filter(
        models.OffboardingTemplate.id == template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update employee status and termination date
    from datetime import datetime as dt
    employee.status = "Terminated"
    employee.termination_date = dt.strptime(termination_date, "%Y-%m-%d").date()
    db.commit()

    # Load default offboarding checklist from JSON
    try:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_offboarding_checklist.json")
        with open(config_path, 'r') as f:
            checklist = json.load(f)
        all_tasks = checklist["tasks"]
    except (FileNotFoundError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Error loading default checklist: {str(e)}")

    # Filter tasks based on employee attributes and conditional logic
    filtered_tasks = []
    for task in all_tasks:
        # Check if task has conditional requirements
        if "conditional" in task:
            condition = task["conditional"]

            # Employment type filtering (use parameter override if provided, else use employee record)
            effective_employment_type = employment_type if employment_type else employee.employment_type

            # Full-time vs Part-time vs International filtering
            if condition == "full_time" and effective_employment_type not in ["Full Time"]:
                continue
            if condition == "part_time" and effective_employment_type not in ["Part Time"]:
                continue
            if condition == "international" and effective_employment_type != "International":
                continue

            # Voluntary vs Involuntary filtering
            if condition == "voluntary" and termination_type != "Voluntary":
                continue
            if condition == "involuntary" and termination_type != "Involuntary":
                continue

            # Equipment check - would need equipment tracking
            # Skipping for now as we don't have has_equipment field

            # Benefits check (only Full Time and International have benefits)
            if condition == "has_benefits":
                if effective_employment_type not in ["Full Time", "International"]:
                    continue

            # COBRA eligibility - only full-time with benefits (not International)
            if condition == "cobra_eligible":
                if effective_employment_type != "Full Time":
                    continue

            # Garnishment check - would need garnishment tracking
            # Skipping for now as we don't have has_garnishment field

        filtered_tasks.append(task)

    created_tasks = []
    year = datetime.now().year

    # Get the maximum task number for this year to avoid conflicts
    max_task = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
    ).order_by(models.OffboardingTask.task_id.desc()).first()

    if max_task and max_task.task_id:
        try:
            last_num = int(max_task.task_id.split('-')[-1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0

    task_counter = last_num

    # Create tasks from filtered checklist (including parent-child relationships)
    for task_template in filtered_tasks:
        task_counter += 1
        task_id = f"OFF-TASK-{year}-{str(task_counter).zfill(4)}"

        due_date = None
        if employee.termination_date and task_template.get("days_from_termination") is not None:
            due_date = employee.termination_date + timedelta(days=task_template["days_from_termination"])

        # Check if this task has subtasks
        has_subtasks = task_template.get("has_subtasks", False)

        # Create parent task
        new_task = models.OffboardingTask(
            task_id=task_id,
            employee_id=employee_id,
            template_id=template_id,
            task_name=task_template["task_name"],
            task_description=task_template.get("task_description"),
            category=task_template["category"],
            assigned_to_role=task_template.get("assigned_to_role"),
            due_date=due_date,
            days_from_termination=task_template.get("days_from_termination"),
            priority=task_template["priority"],
            status="Not Started",
            has_subtasks=has_subtasks,
            is_subtask=False,
            created_at=datetime.now()
        )

        # Store additional metadata for special task types
        task_details = {}
        if task_template.get("is_toggle"):
            task_details["is_toggle"] = True
        if task_template.get("has_action_button"):
            task_details["has_action_button"] = True
            task_details["action_button_label"] = task_template.get("action_button_label")
        if task_details:
            new_task.task_details = task_details

        db.add(new_task)
        db.flush()  # Flush to get the ID for parent task
        created_tasks.append(task_template["task_name"])

        # Create subtasks if they exist
        if has_subtasks and "subtasks" in task_template:
            subtasks = task_template["subtasks"]

            for subtask_template in subtasks:
                # Apply same conditional filtering to subtasks
                if "conditional" in subtask_template:
                    condition = subtask_template["conditional"]

                    # Check conditions
                    if condition == "full_time" and effective_employment_type not in ["Full Time"]:
                        continue
                    if condition == "part_time" and effective_employment_type not in ["Part Time"]:
                        continue
                    if condition == "has_equipment":
                        # Skip for now - would need equipment tracking
                        continue

                task_counter += 1
                subtask_id = f"OFF-TASK-{year}-{str(task_counter).zfill(4)}"

                subtask_due_date = None
                if employee.termination_date and subtask_template.get("days_from_termination") is not None:
                    subtask_due_date = employee.termination_date + timedelta(days=subtask_template["days_from_termination"])

                new_subtask = models.OffboardingTask(
                    task_id=subtask_id,
                    employee_id=employee_id,
                    template_id=template_id,
                    task_name=subtask_template["task_name"],
                    task_description=subtask_template.get("task_description"),
                    category=subtask_template["category"],
                    assigned_to_role=subtask_template.get("assigned_to_role"),
                    due_date=subtask_due_date,
                    days_from_termination=subtask_template.get("days_from_termination"),
                    priority=subtask_template["priority"],
                    status="Not Started",
                    has_subtasks=False,
                    is_subtask=True,
                    parent_task_id=new_task.id,  # Link to parent
                    created_at=datetime.now()
                )

                db.add(new_subtask)
                created_tasks.append(f"  └─ {subtask_template['task_name']}")  # Indent subtask names in response

    db.commit()

    return {
        "message": f"Created {len(created_tasks)} offboarding tasks for {employee.first_name} {employee.last_name}",
        "employee_id": employee_id,
        "tasks_created": len(created_tasks),
        "task_names": created_tasks
    }


@router.post("/tasks/ensure/{employee_id}")
def ensure_offboarding_tasks(
    employee_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Ensure offboarding tasks exist for a terminated employee.

    If the employee is terminated and has no non-archived offboarding tasks,
    this endpoint will create the full set of offboarding tasks using the
    default template and the employee's existing data.

    Returns:
        - already_exists: True if tasks already exist
        - created: True if tasks were just created
        - tasks_count: Number of tasks
    """
    # Verify employee exists
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if employee is terminated
    if employee.status != "Terminated":
        raise HTTPException(
            status_code=400,
            detail="Employee is not terminated. Cannot create offboarding tasks."
        )

    # Check if termination date exists
    if not employee.termination_date:
        raise HTTPException(
            status_code=400,
            detail="Employee has no termination date set."
        )

    # Check if non-archived parent offboarding tasks already exist (exclude subtasks)
    existing_tasks = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.employee_id == employee_id,
        models.OffboardingTask.archived == False,
        (models.OffboardingTask.is_subtask == False) | (models.OffboardingTask.is_subtask == None)
    ).all()

    if existing_tasks:
        return {
            "already_exists": True,
            "created": False,
            "tasks_count": len(existing_tasks),
            "message": f"Offboarding tasks already exist for {employee.first_name} {employee.last_name}"
        }

    # Create offboarding tasks using the default checklist
    try:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_offboarding_checklist.json")
        with open(config_path, 'r') as f:
            checklist = json.load(f)
        all_tasks = checklist["tasks"]
    except (FileNotFoundError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Error loading default checklist: {str(e)}")

    # Determine employment type and termination type
    employment_type = getattr(employee, 'employment_type', None) or "Full Time"
    termination_type = getattr(employee, 'termination_type', None) or "Voluntary"

    # Filter tasks based on employee attributes
    filtered_tasks = []
    for task in all_tasks:
        if "conditional" in task:
            condition = task["conditional"]

            if condition == "full_time" and employment_type not in ["Full Time"]:
                continue
            if condition == "part_time" and employment_type not in ["Part Time"]:
                continue
            if condition == "international" and employment_type != "International":
                continue
            if condition == "voluntary" and termination_type != "Voluntary":
                continue
            if condition == "involuntary" and termination_type != "Involuntary":
                continue
            if condition == "has_benefits" and employment_type not in ["Full Time", "International"]:
                continue
            if condition == "cobra_eligible" and employment_type != "Full Time":
                continue

        filtered_tasks.append(task)

    created_tasks = []
    year = datetime.now().year

    # Get the maximum task number for this year to avoid conflicts
    max_task = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
    ).order_by(models.OffboardingTask.task_id.desc()).first()

    if max_task and max_task.task_id:
        # Extract the number from the task_id (e.g., "OFF-TASK-2025-1234" -> 1234)
        try:
            last_num = int(max_task.task_id.split('-')[-1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0

    task_counter = last_num

    for task_template in filtered_tasks:
        task_counter += 1
        task_id = f"OFF-TASK-{year}-{str(task_counter).zfill(4)}"

        due_date = None
        if employee.termination_date and task_template.get("days_from_termination") is not None:
            due_date = employee.termination_date + timedelta(days=task_template["days_from_termination"])

        has_subtasks = task_template.get("has_subtasks", False)

        new_task = models.OffboardingTask(
            task_id=task_id,
            employee_id=employee_id,
            template_id=1,
            task_name=task_template["task_name"],
            task_description=task_template.get("task_description"),
            category=task_template["category"],
            assigned_to_role=task_template.get("assigned_to_role"),
            due_date=due_date,
            days_from_termination=task_template.get("days_from_termination"),
            priority=task_template["priority"],
            status="Not Started",
            has_subtasks=has_subtasks,
            is_subtask=False,
            created_at=datetime.now()
        )

        task_details = {}
        if task_template.get("is_toggle"):
            task_details["is_toggle"] = True
        if task_template.get("has_action_button"):
            task_details["has_action_button"] = True
            task_details["action_button_label"] = task_template.get("action_button_label")
        if task_details:
            new_task.task_details = task_details

        db.add(new_task)
        db.flush()
        created_tasks.append(task_template["task_name"])

        # Create subtasks if they exist
        if has_subtasks and "subtasks" in task_template:
            for subtask_template in task_template["subtasks"]:
                if "conditional" in subtask_template:
                    condition = subtask_template["conditional"]
                    if condition == "full_time" and employment_type not in ["Full Time"]:
                        continue
                    if condition == "part_time" and employment_type not in ["Part Time"]:
                        continue

                task_counter += 1
                subtask_id = f"OFF-TASK-{year}-{str(task_counter).zfill(4)}"

                subtask_due_date = None
                if employee.termination_date and subtask_template.get("days_from_termination") is not None:
                    subtask_due_date = employee.termination_date + timedelta(days=subtask_template["days_from_termination"])

                new_subtask = models.OffboardingTask(
                    task_id=subtask_id,
                    employee_id=employee_id,
                    template_id=1,
                    task_name=subtask_template["task_name"],
                    task_description=subtask_template.get("task_description"),
                    category=subtask_template["category"],
                    assigned_to_role=subtask_template.get("assigned_to_role"),
                    due_date=subtask_due_date,
                    days_from_termination=subtask_template.get("days_from_termination"),
                    priority=subtask_template["priority"],
                    status="Not Started",
                    has_subtasks=False,
                    is_subtask=True,
                    parent_task_id=new_task.id,
                    created_at=datetime.now()
                )
                db.add(new_subtask)
                created_tasks.append(f"  └─ {subtask_template['task_name']}")

    db.commit()

    return {
        "already_exists": False,
        "created": True,
        "tasks_count": len(created_tasks),
        "message": f"Created {len(created_tasks)} offboarding tasks for {employee.first_name} {employee.last_name}"
    }


# ============================================================================
# Email Notifications
# ============================================================================

class AccessRemovalEmailRequest(BaseModel):
    employee_id: str
    to_emails: List[str]
    cc_emails: Optional[List[str]] = None
    requester_name: Optional[str] = None


class ExitDocumentsEmailRequest(BaseModel):
    employee_id: str
    employee_email: str
    final_pay_date: str
    pto_balance_hours: Optional[float] = 0
    pto_payout_amount: Optional[float] = 0
    cc_emails: Optional[List[str]] = None


@router.post("/send-access-removal-email")
def send_access_removal_email(
    email_request: AccessRemovalEmailRequest,
    db: Session = Depends(database.get_db)
):
    """Send access removal checklist email to IT/Security team"""
    # Get employee details
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == email_request.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not employee.termination_date:
        raise HTTPException(status_code=400, detail="Employee does not have a termination date set")

    # Format termination date
    termination_date_str = employee.termination_date.strftime("%B %d, %Y")

    # Send email
    try:
        email_service.send_access_removal_checklist(
            employee_name=f"{employee.first_name} {employee.last_name}",
            employee_id=employee.employee_id,
            termination_date=termination_date_str,
            department=employee.department or "N/A",
            position=employee.position or "N/A",
            to_emails=email_request.to_emails,
            cc_emails=email_request.cc_emails,
            requester_name=email_request.requester_name
        )

        return {
            "success": True,
            "message": f"Access removal checklist sent to {len(email_request.to_emails)} recipient(s)",
            "employee_id": employee.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "recipients": email_request.to_emails
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/send-exit-documents")
def send_exit_documents_email(
    email_request: ExitDocumentsEmailRequest,
    db: Session = Depends(database.get_db)
):
    """Send exit documents package to departing employee"""
    # Get employee details
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == email_request.employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not employee.termination_date:
        raise HTTPException(status_code=400, detail="Employee does not have a termination date set")

    # Format dates
    termination_date_str = employee.termination_date.strftime("%B %d, %Y")
    hire_date_str = employee.hire_date.strftime("%B %d, %Y") if employee.hire_date else "N/A"

    # Check if employee has benefits (medical tier indicates enrollment)
    has_benefits = bool(employee.medical_tier and employee.medical_tier.strip())

    # Send exit documents email
    try:
        result = email_service.send_exit_documents(
            employee_name=f"{employee.first_name} {employee.last_name}",
            employee_id=employee.employee_id,
            employee_email=email_request.employee_email,
            termination_date=termination_date_str,
            position=employee.position or "N/A",
            department=employee.department or "N/A",
            hire_date=hire_date_str,
            final_pay_date=email_request.final_pay_date,
            pto_balance_hours=email_request.pto_balance_hours or 0,
            pto_payout_amount=email_request.pto_payout_amount or 0,
            has_benefits=has_benefits,
            cc_emails=email_request.cc_emails
        )

        # Update employee record to track that exit docs were sent
        employee.exit_docs_sent = True
        employee.exit_docs_sent_at = datetime.now()
        employee.exit_docs_sent_to = email_request.employee_email
        employee.exit_docs_attachment_count = result.get("attachment_count", 0) if result else 0
        db.commit()

        return {
            "success": True,
            "message": f"Exit documents sent to {email_request.employee_email}",
            "employee_id": employee.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "recipient": email_request.employee_email,
            "sent_at": employee.exit_docs_sent_at.isoformat(),
            "attachment_count": employee.exit_docs_attachment_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send exit documents: {str(e)}")


@router.get("/export-package/{employee_id}")
def export_offboarding_package(
    employee_id: str,
    db: Session = Depends(database.get_db)
):
    """Export comprehensive offboarding package as PDF"""
    # Get employee details
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not employee.termination_date:
        raise HTTPException(status_code=400, detail="Employee does not have a termination date set")

    # Get all offboarding tasks for this employee
    tasks = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.employee_id == employee_id
    ).all()

    # Prepare employee data
    employee_data = {
        "employee_id": employee.employee_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "email": employee.email if hasattr(employee, 'email') else 'N/A',
        "department": employee.department or "N/A",
        "position": employee.position or "N/A",
        "location": employee.location or "N/A",
        "hire_date": employee.hire_date.strftime("%B %d, %Y") if employee.hire_date else "N/A",
        "termination_date": employee.termination_date.strftime("%B %d, %Y"),
        "termination_reason": employee.termination_reason if hasattr(employee, 'termination_reason') and employee.termination_reason else "N/A"
    }

    # Prepare tasks data
    tasks_data = []
    for task in tasks:
        tasks_data.append({
            "task_name": task.task_name,
            "category": task.category,
            "assigned_to_role": task.assigned_to_role or "N/A",
            "due_date": task.due_date.strftime("%m/%d/%Y") if task.due_date else "N/A",
            "status": task.status,
            "priority": task.priority,
            "task_description": task.task_description
        })

    # Company info
    company_info = {
        "name": "Actual Factual, LLC",
        "location": "Bagend, SH",
        "phone": "226-556-668"
    }

    # Generate PDF
    try:
        pdf_buffer = offboarding_pdf_service.generate_offboarding_package(
            employee_data=employee_data,
            tasks=tasks_data,
            company_info=company_info
        )

        # Create filename
        filename = f"Offboarding_Package_{employee.first_name}_{employee.last_name}_{employee.employee_id}_{datetime.now().strftime('%Y%m%d')}.pdf"

        # Return PDF as streaming response
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


# ============================================================================
# Default Offboarding Checklist
# ============================================================================

@router.get("/checklist/default")
def get_default_offboarding_checklist():
    """
    Get the default offboarding checklist template

    Returns the comprehensive 25-step offboarding process that includes:
    - Initial setup and scheduling
    - Documentation (separate checklists for Full Time vs Part Time)
    - Equipment return process
    - Exit interview
    - System processing (Zoho, NBS, Paylocity)
    - PTO and payroll finalization
    - Benefits and COBRA processing
    - Compliance requirements
    - Final documentation and archiving
    """
    try:
        # Load the default checklist JSON file
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_offboarding_checklist.json")

        with open(config_path, 'r') as f:
            checklist = json.load(f)

        return {
            "template_name": checklist["template_name"],
            "template_description": checklist["template_description"],
            "total_tasks": len(checklist["tasks"]),
            "tasks": checklist["tasks"],
            "categories": list(set([task["category"] for task in checklist["tasks"]])),
            "message": "Default offboarding checklist retrieved successfully"
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Default checklist file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid checklist file format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading checklist: {str(e)}")


# ============================================================================
# Exit Document Generation
# ============================================================================

@router.get("/exit-document-data/{employee_id}")
def get_exit_document_data(
    employee_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Get employee data needed for the exit document form.
    Returns current values so user can review and override if needed.
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Calculate PTO remaining
    pto_allotted = employee.pto_allotted or 0
    pto_used = employee.pto_used or 0
    pto_remaining = max(0, pto_allotted - pto_used)

    # Calculate default dates
    term_date = employee.termination_date
    last_pay_date = None
    last_coverage_date = None

    if term_date:
        from datetime import timedelta
        # Last pay date: 2 days after termination
        pay_date = term_date + timedelta(days=2)
        last_pay_date = pay_date.strftime("%m/%d/%Y")

        # Last coverage date: end of termination month
        if term_date.month == 12:
            next_month = term_date.replace(year=term_date.year + 1, month=1, day=1)
        else:
            next_month = term_date.replace(month=term_date.month + 1, day=1)
        end_of_month = next_month - timedelta(days=1)
        last_coverage_date = end_of_month.strftime("%m/%d/%Y")

    return {
        "employee_id": employee.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "termination_date": term_date.strftime("%m/%d/%Y") if term_date else None,
        # Personal contact info
        "personal_email": employee.personal_email or "",
        "personal_phone": employee.personal_phone or "",
        "address_street": employee.address_street or "",
        "address_city": employee.address_city or "",
        "address_state": employee.address_state or "",
        "address_zip": employee.address_zip or "",
        # Calculated values
        "pto_hours": pto_remaining,
        "last_pay_date": last_pay_date,
        "last_coverage_date": last_coverage_date,
        # Supervisor info
        "supervisor_name": employee.supervisor or "",
        "supervisor_email": ""  # Will try to look up if needed
    }


class ExitDocumentRequest(BaseModel):
    pto_hours: Optional[float] = None
    last_pay_date: Optional[str] = None  # MM/DD/YYYY format
    last_coverage_date: Optional[str] = None  # MM/DD/YYYY format
    supervisor_name: Optional[str] = None
    supervisor_email: Optional[str] = None


@router.get("/exit-document/{employee_id}")
def generate_exit_document(
    employee_id: str,
    pto_hours: Optional[float] = None,
    last_pay_date: Optional[str] = None,
    last_coverage_date: Optional[str] = None,
    supervisor_name: Optional[str] = None,
    supervisor_email: Optional[str] = None,
    # Personal contact overrides
    personal_email: Optional[str] = None,
    personal_phone: Optional[str] = None,
    address_street: Optional[str] = None,
    address_city: Optional[str] = None,
    address_state: Optional[str] = None,
    address_zip: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """
    Generate the 'Important Information for Terminating Employee' form
    pre-filled with employee data.

    Args:
        employee_id: The employee's ID
        pto_hours: Override for PTO hours (optional, defaults to calculated balance)
        last_pay_date: Override for last paycheck date (optional)
        last_coverage_date: Override for last coverage date (optional)
        supervisor_name: Override for supervisor name (optional)
        supervisor_email: Supervisor's email for forwarding communications
        personal_email: Override for personal email
        personal_phone: Override for personal phone
        address_street: Override for street address
        address_city: Override for city
        address_state: Override for state
        address_zip: Override for zip code

    Returns:
        PDF file download
    """
    # Get employee
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Apply personal contact overrides to employee object (temporary, not saved to DB)
    # Create a copy of relevant attributes to avoid modifying the DB object
    class EmployeeOverride:
        pass

    emp_data = EmployeeOverride()
    emp_data.first_name = employee.first_name
    emp_data.last_name = employee.last_name
    emp_data.personal_email = personal_email if personal_email else employee.personal_email
    emp_data.personal_phone = personal_phone if personal_phone else employee.personal_phone
    emp_data.address_street = address_street if address_street else employee.address_street
    emp_data.address_city = address_city if address_city else employee.address_city
    emp_data.address_state = address_state if address_state else employee.address_state
    emp_data.address_zip = address_zip if address_zip else employee.address_zip
    emp_data.termination_date = employee.termination_date
    emp_data.pto_allotted = employee.pto_allotted
    emp_data.pto_used = employee.pto_used
    emp_data.supervisor = employee.supervisor
    emp_data.employee_id = employee.employee_id

    # Build termination data
    termination_data = {}
    if pto_hours is not None:
        termination_data['pto_hours'] = pto_hours
    if last_pay_date:
        termination_data['last_pay_date'] = last_pay_date
    if last_coverage_date:
        termination_data['last_coverage_date'] = last_coverage_date

    # Build supervisor data
    supervisor_data = {}
    if supervisor_name:
        supervisor_data['name'] = supervisor_name
    if supervisor_email:
        supervisor_data['email'] = supervisor_email

    # If no supervisor provided, try to get from employee's supervisor field
    if not supervisor_data.get('name') and employee.supervisor:
        supervisor_data['name'] = employee.supervisor
        # Try to get supervisor's email by looking up the supervisor employee
        supervisor_emp = db.query(models.Employee).filter(
            (models.Employee.first_name + " " + models.Employee.last_name) == employee.supervisor
        ).first()
        if supervisor_emp and supervisor_emp.email:
            supervisor_data['email'] = supervisor_emp.email

    # Generate the PDF with overridden employee data
    try:
        pdf_buffer = exit_document_service.generate_form(
            employee=emp_data,
            termination_data=termination_data,
            supervisor_data=supervisor_data
        )

        filename = f"Exit_Info_{employee.first_name}_{employee.last_name}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type='application/pdf',
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate exit document: {str(e)}")


# ============================================================================
# EXIT DOCUMENTS - GENERATE, SAVE, LIST, EMAIL
# ============================================================================

class ExitDocumentGenerateRequest(BaseModel):
    """Request body for generating and saving an exit document"""
    pto_hours: Optional[float] = None
    last_pay_date: Optional[str] = None
    last_coverage_date: Optional[str] = None
    supervisor_name: Optional[str] = None
    supervisor_email: Optional[str] = None
    personal_email: Optional[str] = None
    personal_phone: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None


class ExitDocumentEmailRequest(BaseModel):
    """Request body for sending exit documents via email"""
    recipient_email: str
    template_type: str = "standard"  # "standard", "voluntary", "involuntary"
    employment_type_filter: Optional[str] = None  # "Full Time", "Part Time", or None for all
    document_ids: Optional[List[int]] = None  # Specific documents to attach, or None for all
    include_portability_form: bool = True
    include_conversion_form: bool = True
    include_important_info_form: bool = True
    include_non_solicitation_form: bool = True
    custom_message: Optional[str] = None


@router.post("/exit-document-save/{employee_id}")
def generate_and_save_exit_document(
    employee_id: str,
    request: ExitDocumentGenerateRequest,
    db: Session = Depends(database.get_db)
):
    """
    Generate the 'Important Information for Terminating Employee' form,
    save it to disk, and track it in the database.

    Returns the saved document record.
    """
    # Get employee
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Create override object
    class EmployeeOverride:
        pass

    emp_data = EmployeeOverride()
    emp_data.first_name = employee.first_name
    emp_data.last_name = employee.last_name
    emp_data.personal_email = request.personal_email if request.personal_email else employee.personal_email
    emp_data.personal_phone = request.personal_phone if request.personal_phone else employee.personal_phone
    emp_data.address_street = request.address_street if request.address_street else employee.address_street
    emp_data.address_city = request.address_city if request.address_city else employee.address_city
    emp_data.address_state = request.address_state if request.address_state else employee.address_state
    emp_data.address_zip = request.address_zip if request.address_zip else employee.address_zip
    emp_data.termination_date = employee.termination_date
    emp_data.pto_allotted = employee.pto_allotted
    emp_data.pto_used = employee.pto_used
    emp_data.supervisor = employee.supervisor
    emp_data.employee_id = employee.employee_id

    # Build termination data
    termination_data = {}
    if request.pto_hours is not None:
        termination_data['pto_hours'] = request.pto_hours
    if request.last_pay_date:
        termination_data['last_pay_date'] = request.last_pay_date
    if request.last_coverage_date:
        termination_data['last_coverage_date'] = request.last_coverage_date

    # Build supervisor data
    supervisor_data = {}
    if request.supervisor_name:
        supervisor_data['name'] = request.supervisor_name
    if request.supervisor_email:
        supervisor_data['email'] = request.supervisor_email

    # Generate and save the PDF
    try:
        output_path = exit_document_service.generate_and_save_form(
            employee=emp_data,
            termination_data=termination_data,
            supervisor_data=supervisor_data
        )

        # Get file size
        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else None

        # Create record in FilledPdfForm
        filled_form = models.FilledPdfForm(
            form_type="exit_important_info",
            template_name="Important Information for Terminating Employees - Fillable.pdf",
            employee_id=employee.id,
            file_path=output_path,
            file_size=file_size,
            is_flattened=False,
            form_data={
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "personal_email": emp_data.personal_email,
                "personal_phone": emp_data.personal_phone,
                "address_street": emp_data.address_street,
                "address_city": emp_data.address_city,
                "address_state": emp_data.address_state,
                "address_zip": emp_data.address_zip,
                "pto_hours": termination_data.get('pto_hours'),
                "last_pay_date": termination_data.get('last_pay_date'),
                "last_coverage_date": termination_data.get('last_coverage_date'),
                "supervisor_name": supervisor_data.get('name'),
                "supervisor_email": supervisor_data.get('email')
            },
            generated_by="HR User",
            status="generated"
        )
        db.add(filled_form)
        db.commit()
        db.refresh(filled_form)

        return {
            "id": filled_form.id,
            "form_type": filled_form.form_type,
            "file_path": filled_form.file_path,
            "file_size": filled_form.file_size,
            "generated_at": filled_form.generated_at.isoformat() if filled_form.generated_at else None,
            "status": filled_form.status,
            "employee_name": f"{employee.first_name} {employee.last_name}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate and save exit document: {str(e)}")


@router.get("/exit-documents/{employee_id}")
def list_exit_documents(
    employee_id: str,
    db: Session = Depends(database.get_db)
):
    """
    List all generated exit documents for an employee.
    """
    # Get employee
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get all filled forms for this employee related to exit/offboarding
    documents = db.query(models.FilledPdfForm).filter(
        models.FilledPdfForm.employee_id == employee.id,
        models.FilledPdfForm.form_type.in_([
            "exit_important_info",
            "exit_portability",
            "exit_conversion",
            "exit_non_solicitation"
        ])
    ).order_by(models.FilledPdfForm.generated_at.desc()).all()

    result = []
    for doc in documents:
        # Check if file still exists
        file_exists = os.path.exists(doc.file_path) if doc.file_path else False

        result.append({
            "id": doc.id,
            "form_type": doc.form_type,
            "template_name": doc.template_name,
            "file_path": doc.file_path,
            "file_size": doc.file_size,
            "file_exists": file_exists,
            "generated_at": doc.generated_at.isoformat() if doc.generated_at else None,
            "generated_by": doc.generated_by,
            "status": doc.status,
            "delivered_at": doc.delivered_at.isoformat() if doc.delivered_at else None,
            "delivery_method": doc.delivery_method,
            "delivered_to": doc.delivered_to,
            "form_data": doc.form_data
        })

    # Also return employee info for display
    return {
        "employee_id": employee.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "termination_type": employee.termination_type,
        "employment_type": employee.employment_type,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None,
        "documents": result
    }


@router.post("/tasks/{task_id}/upload")
async def upload_task_document(
    task_id: int,
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(database.get_db)
):
    """
    Upload a file for an offboarding task (e.g. Non-Solicitation document).
    Saves the file and creates a FilledPdfForm record so it appears in
    the Generated Documents list.
    """
    # Get the task
    task = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.id == task_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get the employee
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == task.employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Save file to storage
    upload_dir = "app/storage/filled_forms"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate safe filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"NonSolicitation_{employee.first_name}_{employee.last_name}_{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_name)

    contents = await file.read()
    with open(file_path, 'wb') as f:
        f.write(contents)

    file_size = len(contents)

    # Create FilledPdfForm record so it shows in Generated Documents
    filled_form = models.FilledPdfForm(
        form_type="exit_non_solicitation",
        template_name=f"Non-Solicitation and Confidentiality Document_{employee.first_name} {employee.last_name}",
        employee_id=employee.id,
        file_path=file_path,
        file_size=file_size,
        is_flattened=False,
        form_data={"uploaded": True, "original_filename": file.filename},
        generated_by="HR User",
        status="uploaded"
    )
    db.add(filled_form)
    db.commit()
    db.refresh(filled_form)

    return {
        "id": filled_form.id,
        "form_type": filled_form.form_type,
        "file_path": file_path,
        "file_size": file_size,
        "status": "uploaded",
        "filename": file.filename
    }


@router.get("/exit-document-download/{document_id}")
def download_exit_document(
    document_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Download a specific saved exit document by its ID.
    """
    document = db.query(models.FilledPdfForm).filter(
        models.FilledPdfForm.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    # Read the file
    with open(document.file_path, 'rb') as f:
        content = f.read()

    filename = os.path.basename(document.file_path)

    return StreamingResponse(
        iter([content]),
        media_type='application/pdf',
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.delete("/exit-document/{document_id}")
def delete_exit_document(
    document_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Delete a specific exit document by its ID.
    Removes both the database record and the file from disk.
    """
    document = db.query(models.FilledPdfForm).filter(
        models.FilledPdfForm.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Store file path before deleting record
    file_path = document.file_path

    # Delete the database record
    db.delete(document)
    db.commit()

    # Delete the file from disk if it exists
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Could not delete file {file_path}: {e}")

    return {"success": True, "message": "Document deleted successfully"}


@router.post("/exit-documents-email/{employee_id}")
async def send_exit_documents_email(
    employee_id: str,
    request: ExitDocumentEmailRequest,
    db: Session = Depends(database.get_db)
):
    """
    Send exit documents to employee's personal email.

    Selects appropriate email template based on:
    - termination_type: voluntary/involuntary
    - employment_type: Full Time/Part Time

    Attaches specified documents or all available exit documents.
    """
    # Get employee
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get documents to attach
    if request.document_ids:
        # Get specific documents
        documents = db.query(models.FilledPdfForm).filter(
            models.FilledPdfForm.id.in_(request.document_ids),
            models.FilledPdfForm.employee_id == employee.id
        ).all()
    else:
        # Get all exit documents for this employee
        documents = db.query(models.FilledPdfForm).filter(
            models.FilledPdfForm.employee_id == employee.id,
            models.FilledPdfForm.form_type.in_([
                "exit_important_info",
                "exit_portability",
                "exit_conversion",
                "exit_non_solicitation"
            ])
        ).all()

    # Filter documents based on request
    filtered_docs = []
    for doc in documents:
        if doc.form_type == "exit_important_info" and request.include_important_info_form:
            filtered_docs.append(doc)
        elif doc.form_type == "exit_portability" and request.include_portability_form:
            filtered_docs.append(doc)
        elif doc.form_type == "exit_conversion" and request.include_conversion_form:
            filtered_docs.append(doc)
        elif doc.form_type == "exit_non_solicitation" and request.include_non_solicitation_form:
            filtered_docs.append(doc)

    # Collect attachment paths
    attachments = []
    for doc in filtered_docs:
        if doc.file_path and os.path.exists(doc.file_path):
            attachments.append(doc.file_path)

    # Determine template based on termination type and employment type
    termination_type = employee.termination_type or "Voluntary"
    employment_type = employee.employment_type or "Full Time"

    # Select template
    if request.template_type == "voluntary" or termination_type.lower() == "voluntary":
        template_name = "offboarding/exit_documents_voluntary.html"
    elif request.template_type == "involuntary" or termination_type.lower() == "involuntary":
        template_name = "offboarding/exit_documents_involuntary.html"
    else:
        template_name = "offboarding/exit_documents_standard.html"

    # Build context
    context = {
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "employee_first_name": employee.first_name,
        "employee_last_name": employee.last_name,
        "termination_date": employee.termination_date.strftime("%B %d, %Y") if employee.termination_date else "N/A",
        "termination_type": termination_type,
        "employment_type": employment_type,
        "is_full_time": employment_type.lower() == "full time",
        "is_part_time": employment_type.lower() == "part time",
        "is_voluntary": termination_type.lower() == "voluntary",
        "is_involuntary": termination_type.lower() == "involuntary",
        "document_count": len(attachments),
        "custom_message": request.custom_message,
        "from_name": "HR Department"
    }

    # Build subject
    subject = f"Exit Documentation - {employee.first_name} {employee.last_name}"

    try:
        await email_service.send_email(
            to_emails=[request.recipient_email],
            subject=subject,
            template_name=template_name,
            context=context,
            attachments=attachments if attachments else None
        )

        # Update document records with delivery info
        for doc in filtered_docs:
            doc.delivered_at = datetime.now()
            doc.delivery_method = "email"
            doc.delivered_to = request.recipient_email
            doc.status = "delivered"

        db.commit()

        return {
            "success": True,
            "message": f"Exit documents sent to {request.recipient_email}",
            "documents_sent": len(attachments),
            "recipient": request.recipient_email,
            "template_used": template_name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ============================================================================
# UNIFIED EXIT DOCUMENTS FORM
# ============================================================================

from app.services.unified_exit_document_service import unified_exit_document_service


class UnifiedExitDocumentFormData(BaseModel):
    """Unified form data for all exit documents"""
    # Employee Info
    employee_name: Optional[str] = None
    employee_first_name: Optional[str] = None
    employee_last_name: Optional[str] = None
    date_of_birth: Optional[str] = None  # MM/DD/YYYY
    ssn_full: Optional[str] = None  # Full SSN (XXX-XX-XXXX) - used for document generation only, never stored
    ssn_last_four: Optional[str] = None  # Last 4 digits for display/storage
    employee_class: Optional[str] = "Regular"

    # Contact Info
    personal_email: Optional[str] = None
    personal_phone: Optional[str] = None

    # Address
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None

    # Termination Details
    termination_date: Optional[str] = None
    last_pay_date: Optional[str] = None
    last_coverage_date: Optional[str] = None
    pto_hours: Optional[float] = None

    # Supervisor Info
    supervisor_name: Optional[str] = None
    supervisor_email: Optional[str] = None

    # Compensation Info
    annual_salary: Optional[float] = None
    date_last_salary_increase: Optional[str] = None

    # Insurance Info
    insurance_effective_date: Optional[str] = None
    date_insurance_terminated: Optional[str] = None
    benefits_status: Optional[str] = "Terminated"  # "Terminated" or "Reduced"

    # Termination Circumstances
    stopped_due_to_injury: Optional[bool] = False
    stopped_due_to_retirement: Optional[bool] = False
    waiver_of_premium_filed: Optional[bool] = False
    waiver_determination: Optional[str] = "N/A"  # "Approved", "Denied", "Pending", "N/A"
    premiums_paid_by_employer: Optional[bool] = False

    # Coverage Amounts
    has_employee_basic_life: Optional[bool] = True
    employee_basic_life_amount: Optional[float] = 50000
    has_spouse_basic_life: Optional[bool] = False
    spouse_basic_life_amount: Optional[float] = None
    has_child_basic_life: Optional[bool] = False
    child_basic_life_amount: Optional[float] = None
    has_employee_voluntary_life: Optional[bool] = False
    employee_voluntary_life_amount: Optional[float] = None
    has_spouse_voluntary_life: Optional[bool] = False
    spouse_voluntary_life_amount: Optional[float] = None
    has_child_voluntary_life: Optional[bool] = False
    child_voluntary_life_amount: Optional[float] = None


class UnifiedExitDocumentRequest(BaseModel):
    """Request to generate documents from unified form"""
    form_data: UnifiedExitDocumentFormData
    documents_to_generate: Optional[List[str]] = None  # ["important_info", "conversion", "portability"]


@router.get("/unified-form-structure")
def get_unified_form_structure():
    """
    Get the structure of the unified exit documents form.
    Returns all sections, fields, and which documents each field applies to.
    """
    return unified_exit_document_service.get_unified_form_structure()


@router.get("/unified-form-data/{employee_id}")
def get_unified_form_data(
    employee_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Get pre-populated unified form data for an employee.
    This loads all available data from the employee record to populate the unified form.
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Calculate PTO remaining
    pto_allotted = employee.pto_allotted or 0
    pto_used = employee.pto_used or 0
    pto_remaining = max(0, pto_allotted - pto_used)

    # Calculate default dates
    term_date = employee.termination_date
    last_pay_date = None
    last_coverage_date = None
    date_insurance_terminated = None

    if term_date:
        # Last pay date: 2 days after termination
        pay_date = term_date + timedelta(days=2)
        last_pay_date = pay_date.strftime("%m/%d/%Y")

        # Last coverage date: end of termination month
        if term_date.month == 12:
            next_month = term_date.replace(year=term_date.year + 1, month=1, day=1)
        else:
            next_month = term_date.replace(month=term_date.month + 1, day=1)
        end_of_month = next_month - timedelta(days=1)
        last_coverage_date = end_of_month.strftime("%m/%d/%Y")

        # Insurance terminated = termination date
        date_insurance_terminated = term_date.strftime("%m/%d/%Y")

    # Get annual salary if available
    annual_salary = None
    if hasattr(employee, 'salary') and employee.salary:
        annual_salary = float(employee.salary)
    elif hasattr(employee, 'annual_salary') and employee.annual_salary:
        annual_salary = float(employee.annual_salary)
    elif hasattr(employee, 'annual_wage') and employee.annual_wage:
        annual_salary = float(employee.annual_wage)

    # Get date of birth if available
    date_of_birth = None
    if hasattr(employee, 'date_of_birth') and employee.date_of_birth:
        date_of_birth = employee.date_of_birth.strftime("%m/%d/%Y")
    elif hasattr(employee, 'birth_date') and employee.birth_date:
        date_of_birth = employee.birth_date.strftime("%m/%d/%Y")

    # Get hire date as insurance effective date approximation
    insurance_effective_date = None
    if employee.hire_date:
        insurance_effective_date = employee.hire_date.strftime("%m/%d/%Y")

    # Resolve employment type: prefer employee.type (e.g. "Regular Full Time") over employment_type
    resolved_employment_type = employee.type or employee.employment_type

    # Look up supervisor email by matching supervisor name to an employee record
    supervisor_email = ""
    if employee.supervisor:
        sup_name = employee.supervisor.strip()
        supervisor_emp = db.query(models.Employee).filter(
            func.lower(models.Employee.first_name + " " + models.Employee.last_name) == func.lower(sup_name)
        ).first()
        # Fallback: split name and match first/last separately
        if not supervisor_emp:
            parts = sup_name.split()
            if len(parts) >= 2:
                supervisor_emp = db.query(models.Employee).filter(
                    func.lower(models.Employee.first_name) == func.lower(parts[0]),
                    func.lower(models.Employee.last_name) == func.lower(parts[-1])
                ).first()
        if supervisor_emp:
            if supervisor_emp.personal_email:
                supervisor_email = supervisor_emp.personal_email
            else:
                # Generate work email from name (same pattern as team_portal)
                supervisor_email = f"{supervisor_emp.first_name.lower()}.{supervisor_emp.last_name.lower()}@company.com"

    return {
        "employee_id": employee.employee_id,
        # Employee Info
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "employee_first_name": employee.first_name,
        "employee_last_name": employee.last_name,
        "date_of_birth": date_of_birth,
        "ssn_last_four": "",  # Not stored for security, user must enter
        "employee_class": "Regular",

        # Contact Info
        "personal_email": employee.personal_email or "",
        "personal_phone": employee.personal_phone or "",

        # Address
        "address_street": employee.address_street or "",
        "address_city": employee.address_city or "",
        "address_state": employee.address_state or "",
        "address_zip": employee.address_zip or "",

        # Termination Details
        "termination_date": term_date.strftime("%m/%d/%Y") if term_date else None,
        "last_pay_date": last_pay_date,
        "last_coverage_date": last_coverage_date,
        "pto_hours": pto_remaining,

        # Supervisor Info
        "supervisor_name": employee.supervisor or "",
        "supervisor_email": supervisor_email,

        # Compensation Info
        "annual_salary": annual_salary,
        "date_last_salary_increase": employee.wage_effective_date.strftime("%m/%d/%Y") if hasattr(employee, 'wage_effective_date') and employee.wage_effective_date else None,

        # Insurance Info
        "insurance_effective_date": insurance_effective_date,
        "date_insurance_terminated": date_insurance_terminated,
        "benefits_status": "Terminated",

        # Termination Circumstances - defaults
        "stopped_due_to_injury": False,
        "stopped_due_to_retirement": False,
        "waiver_of_premium_filed": False,
        "waiver_determination": "N/A",
        "premiums_paid_by_employer": False,

        # Coverage Amounts - defaults for full-time employees
        "has_employee_basic_life": resolved_employment_type and "full time" in resolved_employment_type.lower(),
        "employee_basic_life_amount": 50000 if (resolved_employment_type and "full time" in resolved_employment_type.lower()) else None,
        "has_spouse_basic_life": False,
        "spouse_basic_life_amount": None,
        "has_child_basic_life": False,
        "child_basic_life_amount": None,
        "has_employee_voluntary_life": False,
        "employee_voluntary_life_amount": None,
        "has_spouse_voluntary_life": False,
        "spouse_voluntary_life_amount": None,
        "has_child_voluntary_life": False,
        "child_voluntary_life_amount": None,

        # Additional employee info for display
        "employment_type": resolved_employment_type,
        "termination_type": employee.termination_type,
        "department": employee.department,
        "position": employee.position
    }


@router.post("/unified-generate-documents/{employee_id}")
def generate_unified_documents(
    employee_id: str,
    request: UnifiedExitDocumentRequest,
    db: Session = Depends(database.get_db)
):
    """
    Generate exit documents from unified form data.

    This endpoint:
    1. Takes the unified form data
    2. Generates specified documents (or defaults to important_info and conversion)
    3. Saves documents to disk
    4. Creates FilledPdfForm records for tracking
    5. Returns list of generated documents
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Convert Pydantic model to dict
    form_data = request.form_data.model_dump()

    # Determine which documents to generate
    docs_to_generate = request.documents_to_generate
    if not docs_to_generate:
        # Default: generate Important Info for all, Conversion only for full-time
        docs_to_generate = ["important_info"]
        if employee.employment_type == "Full Time":
            docs_to_generate.append("conversion")

    generated_documents = []

    for doc_type in docs_to_generate:
        try:
            # Generate and save the document
            output_path = unified_exit_document_service.generate_and_save_form(
                form_type=doc_type,
                form_data=form_data,
                employee=employee
            )

            # Get file size
            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else None

            # Determine form_type for database
            db_form_type_map = {
                "important_info": "exit_important_info",
                "conversion": "exit_conversion",
                "portability": "exit_portability"
            }
            db_form_type = db_form_type_map.get(doc_type, doc_type)

            # Document display name (document name + employee name)
            employee_full_name = f"{employee.first_name} {employee.last_name}"
            template_name_map = {
                "important_info": f"Important Information for Terminating Employee_{employee_full_name}",
                "conversion": f"Equitable Conversion Form_{employee_full_name}",
                "portability": f"Equitable Portability Form_{employee_full_name}"
            }
            template_name = template_name_map.get(doc_type, f"{doc_type}.pdf")

            # Create FilledPdfForm record
            filled_form = models.FilledPdfForm(
                form_type=db_form_type,
                template_name=template_name,
                employee_id=employee.id,
                file_path=output_path,
                file_size=file_size,
                is_flattened=False,
                form_data=form_data,
                generated_by="HR User",
                status="generated"
            )
            db.add(filled_form)
            db.flush()  # Get the ID

            generated_documents.append({
                "id": filled_form.id,
                "form_type": db_form_type,
                "document_name": template_name_map.get(doc_type, doc_type),
                "file_path": output_path,
                "file_size": file_size,
                "status": "generated"
            })

        except NotImplementedError:
            # Skip unimplemented form types
            continue
        except Exception as e:
            logger.error(f"Error generating {doc_type}: {e}")
            continue

    db.commit()

    return {
        "employee_id": employee.employee_id,
        "employee_name": f"{employee.first_name} {employee.last_name}",
        "documents_generated": len(generated_documents),
        "documents": generated_documents
    }


@router.post("/unified-generate-single/{employee_id}/{document_type}")
def generate_single_unified_document(
    employee_id: str,
    document_type: str,
    request: UnifiedExitDocumentRequest,
    db: Session = Depends(database.get_db)
):
    """
    Generate a single exit document from unified form data.

    Args:
        employee_id: Employee ID
        document_type: One of "important_info", "conversion", "portability"
        request: Unified form data

    Returns the generated document as a streaming download.
    """
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if document_type not in ["important_info", "conversion", "portability"]:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type}")

    # Convert Pydantic model to dict
    form_data = request.form_data.model_dump()

    try:
        # Generate document (without saving to disk)
        if document_type == "important_info":
            buffer = unified_exit_document_service.generate_important_info_form(form_data, employee)
            filename = f"Exit_Info_{employee.first_name}_{employee.last_name}.pdf"
        elif document_type == "conversion":
            buffer = unified_exit_document_service.generate_conversion_form(form_data, employee)
            filename = f"Conversion_Form_{employee.first_name}_{employee.last_name}.pdf"
        elif document_type == "portability":
            buffer = unified_exit_document_service.generate_portability_form(form_data, employee)
            filename = f"Portability_Form_{employee.first_name}_{employee.last_name}.pdf"

        return StreamingResponse(
            buffer,
            media_type='application/pdf',
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except NotImplementedError:
        raise HTTPException(status_code=501, detail=f"{document_type} form not yet implemented")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate document: {str(e)}")
