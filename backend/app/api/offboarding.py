from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import List, Optional
from pydantic import BaseModel
from app.db import models, database
from app.services.email_service import email_service
from app.services.offboarding_pdf_service import offboarding_pdf_service
import json
import os

router = APIRouter(prefix="/offboarding", tags=["offboarding"])


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
        query = query.filter(models.OffboardingTask.status == status)

    tasks = query.order_by(models.OffboardingTask.due_date.asc()).all()

    return {"tasks": tasks, "total": len(tasks)}


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
        # Note: completed_date is now set explicitly by the frontend as ISO timestamp

    if task_update.completion_notes is not None:
        task.completion_notes = task_update.completion_notes

    if task_update.completed_by is not None:
        task.completed_by = task_update.completed_by

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
            "created_by": "User"  # TODO: Get from session/auth
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

    # Get initial count once
    initial_count = db.query(models.OffboardingTask).filter(
        models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
    ).count()

    task_counter = initial_count

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
        email_service.send_exit_documents(
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

        return {
            "success": True,
            "message": f"Exit documents sent to {email_request.employee_email}",
            "employee_id": employee.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "recipient": email_request.employee_email
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
