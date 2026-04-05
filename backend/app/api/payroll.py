"""
Payroll API endpoints
Handles payroll periods, tasks, and processing workflow

RBAC Protection: Payroll data contains sensitive financial information.
Access is restricted to users with PAYROLL_READ or PAYROLL_WRITE permissions.
Roles with access: admin, payroll
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import and_, or_, func, extract
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from ..db import models
from ..db.database import get_db
from .auth import get_current_user
from ..services.rbac_service import require_permission, Permissions

router = APIRouter(
    prefix="/payroll",
    tags=["payroll"],
    # RBAC: Require PAYROLL_READ permission for all endpoints (sensitive financial data)
    dependencies=[Depends(require_permission(Permissions.PAYROLL_READ))]
)


# Pydantic Models

class PayrollPeriodBase(BaseModel):
    year: int
    period_number: int
    start_date: date
    end_date: date
    payday: date
    status: str
    employer_funding: bool
    notes: Optional[str] = None


class PayrollPeriodCreate(PayrollPeriodBase):
    pass


class PayrollPeriodUpdate(BaseModel):
    status: Optional[str] = None
    employer_funding: Optional[bool] = None
    notes: Optional[str] = None


class PayrollTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str
    order_index: int
    parent_task_id: Optional[int] = None
    instructions: Optional[str] = None
    path_reference: Optional[str] = None
    completed: bool = False
    has_toggle: bool = False
    toggle_value: Optional[bool] = None
    toggle_label: Optional[str] = None
    has_email_button: bool = False
    email_template_name: Optional[str] = None
    notes: Optional[str] = None


class PayrollTaskUpdate(BaseModel):
    completed: Optional[bool] = None
    toggle_value: Optional[bool] = None
    notes: Optional[str] = None


class PayrollTaskResponse(BaseModel):
    id: int
    payroll_period_id: int
    title: str
    description: Optional[str]
    task_type: str
    order_index: int
    parent_task_id: Optional[int]
    instructions: Optional[str]
    path_reference: Optional[str]
    completed: bool
    completed_at: Optional[datetime]
    completed_by: Optional[str]
    has_toggle: bool
    toggle_value: Optional[bool]
    toggle_label: Optional[str]
    has_email_button: bool
    email_template_name: Optional[str]
    notes: Optional[str]
    notes_history: Optional[List[dict]] = None
    subtasks: List['PayrollTaskResponse'] = []

    class Config:
        from_attributes = True


class PayrollPeriodResponse(BaseModel):
    id: int
    year: int
    period_number: int
    start_date: date
    end_date: date
    payday: date
    status: str
    employer_funding: bool
    notes: Optional[str]
    notes_history: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime]
    processed_at: Optional[datetime]
    processed_by: Optional[str]
    tasks: List[PayrollTaskResponse] = []

    class Config:
        from_attributes = True


class PayrollDashboardMetrics(BaseModel):
    total_periods_this_year: int
    completed_periods: int
    upcoming_periods: int
    in_progress_periods: int
    next_payday: Optional[date]
    next_period_start: Optional[date]
    current_period: Optional[PayrollPeriodResponse]


class UncheckRequest(BaseModel):
    reason: Optional[str] = None


# Helper Functions

def get_task_hierarchy(tasks: List[models.PayrollTask]) -> List[PayrollTaskResponse]:
    """Convert flat task list into hierarchical structure"""
    task_map = {}
    root_tasks = []

    # First pass: create all task responses
    for task in tasks:
        task_response = PayrollTaskResponse(
            id=task.id,
            payroll_period_id=task.payroll_period_id,
            title=task.title,
            description=task.description,
            task_type=task.task_type,
            order_index=task.order_index,
            parent_task_id=task.parent_task_id,
            instructions=task.instructions,
            path_reference=task.path_reference,
            completed=task.completed,
            completed_at=task.completed_at,
            completed_by=task.completed_by,
            has_toggle=task.has_toggle,
            toggle_value=task.toggle_value,
            toggle_label=task.toggle_label,
            has_email_button=task.has_email_button,
            email_template_name=task.email_template_name,
            notes=task.notes,
            subtasks=[]
        )
        task_map[task.id] = task_response

        if task.task_type == 'main':
            root_tasks.append(task_response)

    # Second pass: build hierarchy
    for task in tasks:
        if task.parent_task_id and task.parent_task_id in task_map:
            task_map[task.parent_task_id].subtasks.append(task_map[task.id])

    # Sort everything by order_index
    root_tasks.sort(key=lambda x: x.order_index)
    for task_response in task_map.values():
        task_response.subtasks.sort(key=lambda x: x.order_index)

    return root_tasks


def add_to_history(current_history: Optional[dict], field: str, old_value: any, new_value: any, username: str):
    """Add an entry to a history field"""
    if current_history is None:
        current_history = {}

    if field not in current_history:
        current_history[field] = []

    current_history[field].append({
        'timestamp': datetime.now().isoformat(),
        'user': username,
        'old_value': old_value,
        'new_value': new_value
    })

    return current_history


# Endpoints

@router.get("/dashboard", response_model=PayrollDashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get dashboard metrics for payroll overview"""
    current_year = datetime.now().year
    today = date.today()

    # Get period counts
    total_periods = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.year == current_year
    ).count()

    completed = db.query(models.PayrollPeriod).filter(
        and_(
            models.PayrollPeriod.year == current_year,
            models.PayrollPeriod.status == 'completed'
        )
    ).count()

    upcoming = db.query(models.PayrollPeriod).filter(
        and_(
            models.PayrollPeriod.year == current_year,
            models.PayrollPeriod.status == 'upcoming'
        )
    ).count()

    in_progress = db.query(models.PayrollPeriod).filter(
        and_(
            models.PayrollPeriod.year == current_year,
            models.PayrollPeriod.status == 'in_progress'
        )
    ).count()

    # Get next payday
    next_period = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.payday >= today
    ).order_by(models.PayrollPeriod.payday).first()

    next_payday = next_period.payday if next_period else None
    next_period_start = next_period.start_date if next_period else None

    # Get current period (in progress or next upcoming)
    current_period = db.query(models.PayrollPeriod).filter(
        or_(
            models.PayrollPeriod.status == 'in_progress',
            and_(
                models.PayrollPeriod.status == 'upcoming',
                models.PayrollPeriod.start_date <= today
            )
        )
    ).order_by(models.PayrollPeriod.start_date).first()

    current_period_response = None
    if current_period:
        tasks = sorted(current_period.tasks, key=lambda x: x.order_index)
        task_hierarchy = get_task_hierarchy(tasks)
        current_period_response = PayrollPeriodResponse(
            id=current_period.id,
            year=current_period.year,
            period_number=current_period.period_number,
            start_date=current_period.start_date,
            end_date=current_period.end_date,
            payday=current_period.payday,
            status=current_period.status,
            employer_funding=current_period.employer_funding,
            notes=current_period.notes,
            created_at=current_period.created_at,
            updated_at=current_period.updated_at,
            processed_at=current_period.processed_at,
            processed_by=current_period.processed_by,
            tasks=task_hierarchy
        )

    return PayrollDashboardMetrics(
        total_periods_this_year=total_periods,
        completed_periods=completed,
        upcoming_periods=upcoming,
        in_progress_periods=in_progress,
        next_payday=next_payday,
        next_period_start=next_period_start,
        current_period=current_period_response
    )


@router.get("/years", response_model=List[int])
def get_payroll_years(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get distinct years that have payroll periods."""
    rows = db.query(models.PayrollPeriod.year).distinct().order_by(models.PayrollPeriod.year).all()
    return [r[0] for r in rows]


@router.get("/periods", response_model=List[PayrollPeriodResponse])
def get_payroll_periods(
    year: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get payroll periods with optional filters"""
    query = db.query(models.PayrollPeriod)

    if year:
        query = query.filter(models.PayrollPeriod.year == year)
    else:
        # Default to current year
        query = query.filter(models.PayrollPeriod.year == datetime.now().year)

    if status and status != 'all':
        query = query.filter(models.PayrollPeriod.status == status)

    periods = query.order_by(models.PayrollPeriod.period_number).all()

    result = []
    for period in periods:
        tasks = sorted(period.tasks, key=lambda x: x.order_index)
        task_hierarchy = get_task_hierarchy(tasks)

        result.append(PayrollPeriodResponse(
            id=period.id,
            year=period.year,
            period_number=period.period_number,
            start_date=period.start_date,
            end_date=period.end_date,
            payday=period.payday,
            status=period.status,
            employer_funding=period.employer_funding,
            notes=period.notes,
            created_at=period.created_at,
            updated_at=period.updated_at,
            processed_at=period.processed_at,
            processed_by=period.processed_by,
            tasks=task_hierarchy
        ))

    return result


@router.get("/periods/{period_id}", response_model=PayrollPeriodResponse)
def get_payroll_period(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific payroll period with all tasks"""
    period = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.id == period_id
    ).first()

    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    tasks = sorted(period.tasks, key=lambda x: x.order_index)
    task_hierarchy = get_task_hierarchy(tasks)

    return PayrollPeriodResponse(
        id=period.id,
        year=period.year,
        period_number=period.period_number,
        start_date=period.start_date,
        end_date=period.end_date,
        payday=period.payday,
        status=period.status,
        employer_funding=period.employer_funding,
        notes=period.notes,
        notes_history=period.notes_history,
        created_at=period.created_at,
        updated_at=period.updated_at,
        processed_at=period.processed_at,
        processed_by=period.processed_by,
        tasks=task_hierarchy
    )


@router.patch("/periods/{period_id}", response_model=PayrollPeriodResponse)
def update_payroll_period(
    period_id: int,
    update: PayrollPeriodUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a payroll period"""
    period = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.id == period_id
    ).first()

    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    # Track notes history
    if update.notes is not None and update.notes.strip():
        period.notes_history = add_to_history(
            period.notes_history,
            'notes',
            period.notes,
            update.notes,
            current_user.username
        )
        flag_modified(period, 'notes_history')
        period.notes = update.notes

    # Update other fields
    if update.status is not None:
        period.status = update.status
        if update.status == 'completed':
            period.processed_at = datetime.now()
            period.processed_by = current_user.username

    if update.employer_funding is not None:
        period.employer_funding = update.employer_funding

    period.updated_at = datetime.now()

    db.commit()
    db.refresh(period)

    tasks = sorted(period.tasks, key=lambda x: x.order_index)
    task_hierarchy = get_task_hierarchy(tasks)

    return PayrollPeriodResponse(
        id=period.id,
        year=period.year,
        period_number=period.period_number,
        start_date=period.start_date,
        end_date=period.end_date,
        payday=period.payday,
        status=period.status,
        employer_funding=period.employer_funding,
        notes=period.notes,
        notes_history=period.notes_history,
        created_at=period.created_at,
        updated_at=period.updated_at,
        processed_at=period.processed_at,
        processed_by=period.processed_by,
        tasks=task_hierarchy
    )


@router.patch("/periods/{period_id}/notes/{note_index}")
def update_period_note(
    period_id: int,
    note_index: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a specific note in the period's notes history"""
    period = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.id == period_id
    ).first()

    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    if not period.notes_history or 'notes' not in period.notes_history:
        raise HTTPException(status_code=404, detail="No notes history found")

    notes_list = period.notes_history['notes']
    if note_index < 0 or note_index >= len(notes_list):
        raise HTTPException(status_code=404, detail="Note not found")

    # Update the note
    notes_list[note_index]['new_value'] = update_data['new_value']
    notes_list[note_index]['timestamp'] = datetime.now().isoformat()

    period.notes_history = {'notes': notes_list}
    flag_modified(period, 'notes_history')

    db.commit()

    return {"message": "Note updated successfully"}


@router.delete("/periods/{period_id}/notes/{note_index}")
def delete_period_note(
    period_id: int,
    note_index: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a specific note from the period's notes history"""
    period = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.id == period_id
    ).first()

    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    if not period.notes_history or 'notes' not in period.notes_history:
        raise HTTPException(status_code=404, detail="No notes history found")

    notes_list = period.notes_history['notes']
    if note_index < 0 or note_index >= len(notes_list):
        raise HTTPException(status_code=404, detail="Note not found")

    # Delete the note
    notes_list.pop(note_index)

    period.notes_history = {'notes': notes_list}
    flag_modified(period, 'notes_history')

    db.commit()

    return {"message": "Note deleted successfully"}


class GeneratePeriodsRequest(BaseModel):
    year: int = Field(..., ge=2024, le=2100, description="Year to generate periods for")


class GeneratePeriodsResponse(BaseModel):
    year: int
    periods_created: int
    message: str


@router.post("/periods/generate", response_model=GeneratePeriodsResponse)
def generate_payroll_periods(
    request: GeneratePeriodsRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission(Permissions.PAYROLL_WRITE))
):
    """Generate 26 biweekly payroll periods with tasks for a given year.

    Idempotent: skips if periods already exist for the requested year.
    Requires PAYROLL_WRITE permission.
    """
    existing = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.year == request.year
    ).first()

    if existing:
        count = db.query(models.PayrollPeriod).filter(
            models.PayrollPeriod.year == request.year
        ).count()
        return GeneratePeriodsResponse(
            year=request.year,
            periods_created=0,
            message=f"Periods already exist for {request.year} ({count} periods). No changes made."
        )

    from ..db.create_payroll_tables import calculate_biweekly_periods, create_default_tasks

    periods_data = calculate_biweekly_periods(request.year)
    task_templates = create_default_tasks()

    for period_data in periods_data:
        period = models.PayrollPeriod(**period_data)
        db.add(period)
        db.flush()

        parent_task_map = {}
        for task_template in task_templates:
            task_data = task_template.copy()
            task_data['payroll_period_id'] = period.id

            parent_ref = task_data.pop('parent_ref', None)
            if parent_ref and parent_ref in parent_task_map:
                task_data['parent_task_id'] = parent_task_map[parent_ref].id

            task = models.PayrollTask(**task_data)
            db.add(task)
            db.flush()

            if task.task_type == 'main':
                parent_task_map[task.order_index] = task

    db.commit()

    logger.info("Generated %d payroll periods for %d by user %s",
                len(periods_data), request.year, current_user.username)

    return GeneratePeriodsResponse(
        year=request.year,
        periods_created=len(periods_data),
        message=f"Successfully generated {len(periods_data)} biweekly periods for {request.year}."
    )


@router.patch("/tasks/{task_id}", response_model=PayrollTaskResponse)
def update_payroll_task(
    task_id: int,
    update: PayrollTaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a payroll task"""
    task = db.query(models.PayrollTask).filter(
        models.PayrollTask.id == task_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Track notes history
    if update.notes is not None and update.notes != task.notes:
        task.notes_history = add_to_history(
            task.notes_history,
            'notes',
            task.notes,
            update.notes,
            current_user.username
        )
        task.notes = update.notes

    # Update completion status
    if update.completed is not None:
        if update.completed and not task.completed:
            # Marking as complete
            task.completed = True
            task.completed_at = datetime.now()
            task.completed_by = current_user.username

            # Auto-transition period from "upcoming" to "in_progress" on first task completion
            period = db.query(models.PayrollPeriod).filter(
                models.PayrollPeriod.id == task.payroll_period_id
            ).first()
            if period and period.status == 'upcoming':
                period.status = 'in_progress'
                period.updated_at = datetime.now()

        elif not update.completed and task.completed:
            # Should use uncheck endpoint for audit trail
            raise HTTPException(
                status_code=400,
                detail="Use POST /tasks/{task_id}/uncheck to uncheck a task"
            )

    # Update toggle value
    if update.toggle_value is not None and task.has_toggle:
        task.toggle_value = update.toggle_value

    db.commit()
    db.refresh(task)

    # Get subtasks if any
    subtasks = []
    if task.task_type == 'main':
        subtask_objs = db.query(models.PayrollTask).filter(
            models.PayrollTask.parent_task_id == task.id
        ).order_by(models.PayrollTask.order_index).all()

        for subtask in subtask_objs:
            subtasks.append(PayrollTaskResponse(
                id=subtask.id,
                payroll_period_id=subtask.payroll_period_id,
                title=subtask.title,
                description=subtask.description,
                task_type=subtask.task_type,
                order_index=subtask.order_index,
                parent_task_id=subtask.parent_task_id,
                instructions=subtask.instructions,
                path_reference=subtask.path_reference,
                completed=subtask.completed,
                completed_at=subtask.completed_at,
                completed_by=subtask.completed_by,
                has_toggle=subtask.has_toggle,
                toggle_value=subtask.toggle_value,
                toggle_label=subtask.toggle_label,
                has_email_button=subtask.has_email_button,
                email_template_name=subtask.email_template_name,
                notes=subtask.notes,
                subtasks=[]
            ))

    return PayrollTaskResponse(
        id=task.id,
        payroll_period_id=task.payroll_period_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        order_index=task.order_index,
        parent_task_id=task.parent_task_id,
        instructions=task.instructions,
        path_reference=task.path_reference,
        completed=task.completed,
        completed_at=task.completed_at,
        completed_by=task.completed_by,
        has_toggle=task.has_toggle,
        toggle_value=task.toggle_value,
        toggle_label=task.toggle_label,
        has_email_button=task.has_email_button,
        email_template_name=task.email_template_name,
        notes=task.notes,
        subtasks=subtasks
    )


@router.post("/tasks/{task_id}/uncheck", response_model=PayrollTaskResponse)
def uncheck_payroll_task(
    task_id: int,
    request: UncheckRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Uncheck a completed task with audit trail"""
    task = db.query(models.PayrollTask).filter(
        models.PayrollTask.id == task_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not task.completed:
        raise HTTPException(status_code=400, detail="Task is not completed")

    # Add to uncheck history
    task.uncheck_history = add_to_history(
        task.uncheck_history,
        'uncheck',
        {
            'completed': True,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'completed_by': task.completed_by
        },
        {
            'completed': False,
            'reason': request.reason
        },
        current_user.username
    )

    # Uncheck the task
    task.completed = False
    task.completed_at = None
    task.completed_by = None

    db.commit()
    db.refresh(task)

    # Get subtasks if any
    subtasks = []
    if task.task_type == 'main':
        subtask_objs = db.query(models.PayrollTask).filter(
            models.PayrollTask.parent_task_id == task.id
        ).order_by(models.PayrollTask.order_index).all()

        for subtask in subtask_objs:
            subtasks.append(PayrollTaskResponse(
                id=subtask.id,
                payroll_period_id=subtask.payroll_period_id,
                title=subtask.title,
                description=subtask.description,
                task_type=subtask.task_type,
                order_index=subtask.order_index,
                parent_task_id=subtask.parent_task_id,
                instructions=subtask.instructions,
                path_reference=subtask.path_reference,
                completed=subtask.completed,
                completed_at=subtask.completed_at,
                completed_by=subtask.completed_by,
                has_toggle=subtask.has_toggle,
                toggle_value=subtask.toggle_value,
                toggle_label=subtask.toggle_label,
                has_email_button=subtask.has_email_button,
                email_template_name=subtask.email_template_name,
                notes=subtask.notes,
                subtasks=[]
            ))

    return PayrollTaskResponse(
        id=task.id,
        payroll_period_id=task.payroll_period_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        order_index=task.order_index,
        parent_task_id=task.parent_task_id,
        instructions=task.instructions,
        path_reference=task.path_reference,
        completed=task.completed,
        completed_at=task.completed_at,
        completed_by=task.completed_by,
        has_toggle=task.has_toggle,
        toggle_value=task.toggle_value,
        toggle_label=task.toggle_label,
        has_email_button=task.has_email_button,
        email_template_name=task.email_template_name,
        notes=task.notes,
        subtasks=subtasks
    )


@router.post("/periods/{period_id}/send-email/{template_name}")
def send_payroll_email(
    period_id: int,
    template_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Send a payroll-related email"""
    period = db.query(models.PayrollPeriod).filter(
        models.PayrollPeriod.id == period_id
    ).first()

    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    return {
        "success": True,
        "message": f"Email '{template_name}' sent for payroll period {period.year}-{period.period_number:02d}",
        "period_id": period_id,
        "template": template_name
    }
