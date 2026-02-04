from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import models, database
from app.api.auth import get_current_user
from app.services.audit_service import audit_service
import csv
import io
from typing import List, Dict, Optional
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(get_current_user)]  # Require authentication for all endpoints
)


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
            "employee_id": e.employee_id,
            "first_name": e.first_name,
            "last_name": e.last_name,
            "name": f"{e.first_name or ''} {e.last_name or ''}".strip(),
            "status": e.status,
            "type": e.type,
            "role": e.type,
            "department": e.department,
            "cost_center": e.cost_center,
            "team": e.team,
            "position": e.position,
            "supervisor": e.supervisor,
            "hire_date": e.hire_date.isoformat() if e.hire_date else None,
            "termination_date": e.termination_date.isoformat() if e.termination_date else None,
            "wage": e.wage,
            "wage_type": e.wage_type,
            "annual_wage": e.annual_wage,
            "hourly_wage": e.hourly_wage,
            "benefits_cost": e.benefits_cost,
            "benefits_cost_annual": e.benefits_cost_annual or e.benefits_cost,
            "employer_taxes_annual": e.employer_taxes_annual,
            "total_compensation": e.total_compensation,
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
    """Update an employee's attendance days."""
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.attendance_days = attendance_days
    db.commit()
    db.refresh(employee)
    return {"message": "Attendance updated successfully", "attendance_days": employee.attendance_days}


@router.put("/{employee_id}/contributions")
def update_contributions(
    request: Request,
    employee_id: str,
    contribution_data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an employee's benefit contributions."""
    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Capture old values for audit log
    old_contributions = {
        "hsa_ee_contribution": employee.hsa_ee_contribution,
        "hsa_er_contribution": employee.hsa_er_contribution,
        "hra_er_contribution": employee.hra_er_contribution,
        "fsa_contribution": employee.fsa_contribution,
        "lfsa_contribution": employee.lfsa_contribution,
        "dependent_care_fsa": employee.dependent_care_fsa,
        "retirement_ee_contribution_amount": employee.retirement_ee_contribution_amount,
        "retirement_ee_contribution_pct": employee.retirement_ee_contribution_pct,
    }

    # Update contribution fields (round to 2 decimal places for monetary precision)
    if "medical_tier" in contribution_data:
        employee.medical_tier = contribution_data["medical_tier"]
    if "hsa_ee_contribution" in contribution_data:
        employee.hsa_ee_contribution = round(contribution_data["hsa_ee_contribution"], 2) if contribution_data["hsa_ee_contribution"] else None
    if "hsa_er_contribution" in contribution_data:
        employee.hsa_er_contribution = round(contribution_data["hsa_er_contribution"], 2) if contribution_data["hsa_er_contribution"] else None
    if "hra_er_contribution" in contribution_data:
        employee.hra_er_contribution = round(contribution_data["hra_er_contribution"], 2) if contribution_data["hra_er_contribution"] else None
    if "fsa_contribution" in contribution_data:
        employee.fsa_contribution = round(contribution_data["fsa_contribution"], 2) if contribution_data["fsa_contribution"] else None
    if "lfsa_contribution" in contribution_data:
        employee.lfsa_contribution = round(contribution_data["lfsa_contribution"], 2) if contribution_data["lfsa_contribution"] else None
    if "dependent_care_fsa" in contribution_data:
        employee.dependent_care_fsa = round(contribution_data["dependent_care_fsa"], 2) if contribution_data["dependent_care_fsa"] else None
    if "retirement_ee_contribution_amount" in contribution_data:
        employee.retirement_ee_contribution_amount = round(contribution_data["retirement_ee_contribution_amount"], 2) if contribution_data["retirement_ee_contribution_amount"] else None
    if "retirement_ee_contribution_pct" in contribution_data:
        employee.retirement_ee_contribution_pct = round(contribution_data["retirement_ee_contribution_pct"], 2) if contribution_data["retirement_ee_contribution_pct"] else None

    db.commit()
    db.refresh(employee)

    # Audit log: contributions updated (financial data)
    new_contributions = {
        "hsa_ee_contribution": employee.hsa_ee_contribution,
        "hsa_er_contribution": employee.hsa_er_contribution,
        "hra_er_contribution": employee.hra_er_contribution,
        "fsa_contribution": employee.fsa_contribution,
        "lfsa_contribution": employee.lfsa_contribution,
        "dependent_care_fsa": employee.dependent_care_fsa,
        "retirement_ee_contribution_amount": employee.retirement_ee_contribution_amount,
        "retirement_ee_contribution_pct": employee.retirement_ee_contribution_pct,
    }
    audit_service.log_data_update(
        db, current_user, request, "employee_contributions", employee_id,
        old_data=old_contributions, new_data=new_contributions
    )

    return {
        "message": "Contributions updated successfully",
        "employee_id": employee.employee_id,
        "contributions": new_contributions
    }


@router.patch("/{employee_id}")
def update_employee(
    request: Request,
    employee_id: str,
    update_data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an employee. Automatically creates offboarding tasks if status is set to Terminated."""
    from datetime import datetime, timedelta

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Capture old values for audit log
    old_values = {
        "status": employee.status,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None
    }

    # Check if status is being changed to Terminated OR termination_date is being set
    status_changed_to_terminated = (
        "status" in update_data and
        update_data["status"] == "Terminated" and
        employee.status != "Terminated"
    )

    termination_date_set = (
        "termination_date" in update_data and
        update_data["termination_date"] is not None
    )

    # Check if status is being changed FROM Terminated TO Active
    status_changed_to_active = (
        "status" in update_data and
        update_data["status"] == "Active" and
        employee.status == "Terminated"
    )

    # Update employee fields
    if "status" in update_data:
        employee.status = update_data["status"]
    if "termination_date" in update_data:
        from datetime import datetime as dt
        employee.termination_date = dt.strptime(update_data["termination_date"], "%Y-%m-%d").date()

    # Auto-set status to Terminated if termination_date is set
    if termination_date_set and employee.status != "Terminated":
        employee.status = "Terminated"

    db.commit()
    db.refresh(employee)

    # Handle status change from Terminated to Active - archive offboarding tasks
    if status_changed_to_active:
        # Find all offboarding tasks for this employee
        offboarding_tasks = db.query(models.OffboardingTask).filter(
            models.OffboardingTask.employee_id == employee_id
        ).all()

        if offboarding_tasks:
            # Archive all tasks and add archival note to task_details
            for task in offboarding_tasks:
                task.archived = True
                # Add archival information to task_details
                if task.task_details is None:
                    task.task_details = {}
                task.task_details["archived_at"] = datetime.now().isoformat()
                task.task_details["archived_reason"] = f"Employee status changed from Terminated to Active on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

            db.commit()

    # Auto-create offboarding tasks if status changed to Terminated OR termination_date was set
    should_create_offboarding = (status_changed_to_terminated or termination_date_set) and employee.termination_date

    if should_create_offboarding:
        # Check if non-archived offboarding tasks already exist
        existing_tasks = db.query(models.OffboardingTask).filter(
            models.OffboardingTask.employee_id == employee_id,
            models.OffboardingTask.archived == False
        ).first()

        if not existing_tasks:
            # Use the comprehensive offboarding checklist system
            import json
            import os

            try:
                # Load the default offboarding checklist
                from app.api import offboarding as offboarding_api
                config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_offboarding_checklist.json")
                with open(config_path, 'r') as f:
                    checklist = json.load(f)
                all_tasks = checklist["tasks"]

                # Determine employment type and termination type (defaults)
                employment_type = employee.employment_type if hasattr(employee, 'employment_type') and employee.employment_type else "Full Time"
                termination_type = "Voluntary"  # Default, could be enhanced to track this

                # Filter tasks based on employee attributes
                filtered_tasks = []
                for task in all_tasks:
                    # Check if task has conditional requirements
                    if "conditional" in task:
                        condition = task["conditional"]

                        # Employment type filtering
                        if condition == "full_time" and employment_type not in ["Full Time"]:
                            continue
                        if condition == "part_time" and employment_type not in ["Part Time"]:
                            continue
                        if condition == "international" and employment_type != "International":
                            continue

                        # Voluntary vs Involuntary filtering
                        if condition == "voluntary" and termination_type != "Voluntary":
                            continue
                        if condition == "involuntary" and termination_type != "Involuntary":
                            continue

                        # Benefits check
                        if condition == "has_benefits":
                            if employment_type not in ["Full Time", "International"]:
                                continue

                        # COBRA eligibility
                        if condition == "cobra_eligible":
                            if employment_type != "Full Time":
                                continue

                    filtered_tasks.append(task)

                # Create tasks from filtered checklist
                year = datetime.now().year
                initial_count = db.query(models.OffboardingTask).filter(
                    models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
                ).count()

                task_counter = initial_count

                for task_template in filtered_tasks:
                    task_counter += 1
                    task_id = f"OFF-TASK-{year}-{str(task_counter).zfill(4)}"

                    due_date = None
                    if employee.termination_date and task_template.get("days_from_termination") is not None:
                        due_date = employee.termination_date + timedelta(days=task_template["days_from_termination"])

                    has_subtasks = task_template.get("has_subtasks", False)

                    # Create parent task
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

                    # Store additional metadata
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

                    # Create subtasks if they exist
                    if has_subtasks and "subtasks" in task_template:
                        for subtask_template in task_template["subtasks"]:
                            # Apply same conditional filtering to subtasks
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

                db.commit()

            except Exception as e:
                print(f"Error creating comprehensive offboarding tasks: {e}")
                db.rollback()
                # Fall back to not creating tasks if there's an error
                pass

    # Audit log: employee updated
    new_values = {
        "status": employee.status,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None
    }
    audit_service.log_data_update(
        db, current_user, request, "employee", employee_id,
        old_data=old_values, new_data=new_values
    )

    return {
        "message": "Employee updated successfully",
        "employee_id": employee.employee_id,
        "status": employee.status,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None,
        "offboarding_created": status_changed_to_terminated
    }


class StatusChangeRequest(BaseModel):
    new_status: str
    reason: Optional[str] = None  # 'mistakenly_terminated', 'rehired', 'termination_cancelled'
    rehire_date: Optional[str] = None
    cancellation_reason: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{employee_id}/status-change")
def change_employee_status_with_reason(
    http_request: Request,
    employee_id: str,
    request: StatusChangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change an employee's status with a reason and proper handling.

    For Terminated -> Active transitions:
    - mistakenly_terminated: Deletes all offboarding tasks and clears termination data
    - rehired: Archives offboarding tasks as historical, sets rehire date
    - termination_cancelled: Archives tasks with cancellation reason

    For Active -> Terminated transitions:
    - Creates offboarding tasks automatically
    """
    from datetime import datetime as dt
    import json as json_lib

    employee = db.query(models.Employee).filter(
        models.Employee.employee_id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_status = employee.status
    new_status = request.new_status

    # Build status change history entry
    history_entry = {
        "timestamp": datetime.now().isoformat(),
        "from_status": old_status,
        "to_status": new_status,
        "reason": request.reason,
        "notes": request.notes
    }

    # Get existing history or initialize
    if employee.status_change_history:
        try:
            history = employee.status_change_history if isinstance(employee.status_change_history, list) else []
        except:
            history = []
    else:
        history = []

    history.append(history_entry)

    # Handle Terminated -> Active transitions
    if old_status == "Terminated" and new_status == "Active":
        if not request.reason:
            raise HTTPException(
                status_code=400,
                detail="A reason is required when reactivating a terminated employee"
            )

        if request.reason == "mistakenly_terminated":
            # Full reset - delete all offboarding tasks and clear termination data
            db.query(models.OffboardingTask).filter(
                models.OffboardingTask.employee_id == employee_id
            ).delete()

            employee.termination_date = None
            employee.termination_type = None
            employee.reactivation_reason = "mistakenly_terminated"
            employee.reactivation_notes = request.notes

        elif request.reason == "rehired":
            # Archive previous offboarding tasks
            offboarding_tasks = db.query(models.OffboardingTask).filter(
                models.OffboardingTask.employee_id == employee_id
            ).all()

            for task in offboarding_tasks:
                task.archived = True
                if task.task_details is None:
                    task.task_details = {}
                task.task_details["archived_at"] = datetime.now().isoformat()
                task.task_details["archived_reason"] = "Employee rehired"
                task.task_details["original_termination_date"] = employee.termination_date.isoformat() if employee.termination_date else None

            # Store original hire date if not already stored
            if not employee.original_hire_date and employee.hire_date:
                employee.original_hire_date = employee.hire_date

            # Set rehire date
            if request.rehire_date:
                employee.rehire_date = dt.strptime(request.rehire_date, "%Y-%m-%d").date()
                # Update hire_date to rehire date for tenure calculations
                employee.hire_date = employee.rehire_date
            else:
                employee.rehire_date = datetime.now().date()
                employee.hire_date = employee.rehire_date

            # Keep termination date as historical but clear active termination status
            # Store in history
            history_entry["previous_termination_date"] = employee.termination_date.isoformat() if employee.termination_date else None

            employee.termination_date = None
            employee.termination_type = None
            employee.reactivation_reason = "rehired"
            employee.reactivation_notes = request.notes

        elif request.reason == "termination_cancelled":
            if not request.cancellation_reason:
                raise HTTPException(
                    status_code=400,
                    detail="A cancellation reason is required"
                )

            # Archive offboarding tasks with cancellation note
            offboarding_tasks = db.query(models.OffboardingTask).filter(
                models.OffboardingTask.employee_id == employee_id
            ).all()

            for task in offboarding_tasks:
                task.archived = True
                if task.task_details is None:
                    task.task_details = {}
                task.task_details["archived_at"] = datetime.now().isoformat()
                task.task_details["archived_reason"] = f"Termination cancelled: {request.cancellation_reason}"

            employee.termination_date = None
            employee.termination_type = None
            employee.reactivation_reason = "termination_cancelled"
            employee.reactivation_notes = f"{request.cancellation_reason}\n\n{request.notes or ''}"

    # Handle Active -> Terminated transitions
    elif old_status != "Terminated" and new_status == "Terminated":
        employee.termination_date = datetime.now().date()
        employee.reactivation_reason = None
        employee.reactivation_notes = None

        # Check if offboarding tasks already exist (non-archived)
        existing_tasks = db.query(models.OffboardingTask).filter(
            models.OffboardingTask.employee_id == employee_id,
            models.OffboardingTask.archived == False
        ).first()

        if not existing_tasks:
            # Create offboarding tasks (reuse existing logic)
            try:
                import os
                config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_offboarding_checklist.json")
                with open(config_path, 'r') as f:
                    checklist = json_lib.load(f)
                all_tasks = checklist["tasks"]

                employment_type = employee.employment_type if employee.employment_type else "Full Time"
                termination_type = "Voluntary"

                filtered_tasks = []
                for task in all_tasks:
                    if "conditional" in task:
                        condition = task["conditional"]
                        if condition == "full_time" and employment_type not in ["Full Time"]:
                            continue
                        if condition == "part_time" and employment_type not in ["Part Time"]:
                            continue
                        if condition == "has_benefits" and employment_type not in ["Full Time", "International"]:
                            continue
                        if condition == "cobra_eligible" and employment_type != "Full Time":
                            continue
                    filtered_tasks.append(task)

                year = datetime.now().year
                max_task = db.query(models.OffboardingTask).filter(
                    models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
                ).order_by(models.OffboardingTask.task_id.desc()).first()

                if max_task and max_task.task_id:
                    try:
                        last_num = int(max_task.task_id.split('-')[-1])
                    except:
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

            except Exception as e:
                print(f"Error creating offboarding tasks: {e}")

    # Update status and history
    employee.status = new_status
    employee.status_change_history = history

    db.commit()
    db.refresh(employee)

    # Audit log: status change (critical security event)
    audit_service.log_data_update(
        db, current_user, http_request, "employee", employee_id,
        old_data={"status": old_status, "reason": None},
        new_data={"status": new_status, "reason": request.reason, "notes": request.notes}
    )

    return {
        "message": f"Employee status changed from {old_status} to {new_status}",
        "employee_id": employee.employee_id,
        "status": employee.status,
        "reason": request.reason,
        "termination_date": employee.termination_date.isoformat() if employee.termination_date else None,
        "rehire_date": employee.rehire_date.isoformat() if employee.rehire_date else None
    }


@router.post("/contributions/reconcile")
async def reconcile_contributions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a CSV or Excel file with contribution data and reconcile it against the system.

    Supports two formats:
    1. CSV: Employee ID, HSA Employee, HSA Employer, HRA Employer, FSA, LFSA, Dependent Care FSA, 401k
    2. Excel (Payroll Deduction Listing): Structured format with deduction sections

    Returns a reconciliation report with matches, discrepancies, and missing employees.
    """
    # Validate file type
    is_csv = file.filename.endswith('.csv')
    is_excel = file.filename.endswith(('.xlsx', '.xls'))

    if not (is_csv or is_excel):
        raise HTTPException(status_code=400, detail="File must be a CSV or Excel file")

    # Read and parse file
    try:
        contents = await file.read()
        file_data = {}

        if is_csv:
            # Parse CSV file (original format)
            csv_data = csv.DictReader(io.StringIO(contents.decode('utf-8')))

            for row in csv_data:
                employee_id = row.get('Employee ID', '').strip()
                if not employee_id:
                    continue

                # Parse contribution amounts (handle both monthly and annual values)
                file_data[employee_id] = {
                    'hsa_ee': float(row.get('HSA Employee', 0) or 0),
                    'hsa_er': float(row.get('HSA Employer', 0) or 0),
                    'hra_er': float(row.get('HRA Employer', 0) or 0),
                    'fsa': float(row.get('FSA', 0) or 0),
                    'lfsa': float(row.get('LFSA', 0) or 0),
                    'dcfsa': float(row.get('Dependent Care FSA', 0) or 0),
                    'retirement': float(row.get('401k', 0) or 0),
                }
        else:
            # Parse Excel file (Payroll Deduction Listing format)
            import pandas as pd

            df = pd.read_excel(io.BytesIO(contents), header=None)

            # Mapping of deduction codes to contribution types
            deduction_mapping = {
                # HSA - Employee contributions
                'HSA': ('hsa_ee', 'monthly'),
                'HSACH': ('hsa_ee', 'monthly'),
                'HSAFM': ('hsa_ee', 'monthly'),
                'HSASP': ('hsa_ee', 'monthly'),
                # HSA - Employer contributions (if present)
                'HSAER': ('hsa_er', 'monthly'),
                # HRA - Employer only
                'HRA': ('hra_er', 'monthly'),
                'HRAER': ('hra_er', 'monthly'),
                # FSA
                'FSA': ('fsa', 'monthly'),
                # Limited FSA
                'FSAL': ('lfsa', 'monthly'),
                # Dependent Care FSA
                'DCARE': ('dcfsa', 'monthly'),
                # 401k
                '401K': ('retirement', 'biweekly'),
                '4ROTH': ('retirement', 'biweekly'),
            }

            current_deduction_type = None

            for idx, row in df.iterrows():
                # Skip empty rows
                if pd.isna(row[0]) and pd.isna(row[1]):
                    continue

                # Check if this is a deduction type header
                if pd.notna(row[0]) and '--' in str(row[0]):
                    # Extract deduction code (e.g., "401K" from "401K   --   401k")
                    deduction_code = str(row[0]).split('--')[0].strip()
                    current_deduction_type = deduction_mapping.get(deduction_code)
                    continue

                # Skip company and header rows
                if pd.notna(row[0]) and ('Company:' in str(row[0]) or 'Totals for' in str(row[0])):
                    continue

                # Skip column header rows
                if pd.notna(row[1]) and str(row[1]).strip() == 'Employee':
                    continue

                # Process employee data rows
                if current_deduction_type and pd.notna(row[3]):  # row[3] should be the ID
                    try:
                        employee_id = str(int(float(row[3]))).strip()
                        amount = float(row[8]) if pd.notna(row[8]) else 0.0  # row[8] is Amount

                        if employee_id and amount > 0:
                            # Initialize employee if not exists
                            if employee_id not in file_data:
                                file_data[employee_id] = {
                                    'hsa_ee': 0.0,
                                    'hsa_er': 0.0,
                                    'hra_er': 0.0,
                                    'fsa': 0.0,
                                    'lfsa': 0.0,
                                    'dcfsa': 0.0,
                                    'retirement': 0.0,
                                }

                            contrib_type, frequency = current_deduction_type

                            # Convert to monthly if needed
                            if frequency == 'biweekly':
                                # 26 pay periods per year / 12 months
                                monthly_amount = amount * 26 / 12
                            else:
                                monthly_amount = amount

                            # Add to existing amount (in case there are multiple entries)
                            file_data[employee_id][contrib_type] += monthly_amount
                    except (ValueError, TypeError):
                        continue

        # Get all employees from database
        employees = db.query(models.Employee).all()

        # Prepare reconciliation results
        matches = []
        discrepancies = []
        missing_in_system = []
        missing_in_file = []

        # Track which employees we've seen in the file
        file_employee_ids = set(file_data.keys())

        # Compare each employee in the database
        for emp in employees:
            system_data = {
                'hsa_ee': round(emp.hsa_ee_contribution or 0, 2),
                'hsa_er': round(emp.hsa_er_contribution or 0, 2),
                'hra_er': round(emp.hra_er_contribution or 0, 2),
                'fsa': round(emp.fsa_contribution or 0, 2),
                'lfsa': round(emp.lfsa_contribution or 0, 2),
                'dcfsa': round(emp.dependent_care_fsa or 0, 2),
                'retirement': round(emp.retirement_ee_contribution_amount or 0, 2),
            }

            # Check if employee has any contributions in the system
            has_contributions = any(v > 0 for v in system_data.values())

            if emp.employee_id in file_data:
                # Employee exists in both file and system
                uploaded_data = file_data[emp.employee_id]

                # Compare values (with tolerance for rounding)
                differences = {}
                tolerance = 0.01

                for key in system_data.keys():
                    system_val = system_data[key]
                    file_val = round(uploaded_data[key], 2)

                    if abs(system_val - file_val) > tolerance:
                        differences[key] = {
                            'system': system_val,
                            'file': file_val,
                            'difference': round(file_val - system_val, 2)
                        }

                if differences:
                    discrepancies.append({
                        'employee_id': emp.employee_id,
                        'employee_name': f"{emp.first_name} {emp.last_name}",
                        'department': emp.department,
                        'differences': differences
                    })
                else:
                    # Only include in matches if there are actual contributions
                    if has_contributions or any(v > 0 for v in uploaded_data.values()):
                        matches.append({
                            'employee_id': emp.employee_id,
                            'employee_name': f"{emp.first_name} {emp.last_name}",
                            'department': emp.department
                        })
            elif has_contributions:
                # Employee has contributions in system but not in file
                missing_in_file.append({
                    'employee_id': emp.employee_id,
                    'employee_name': f"{emp.first_name} {emp.last_name}",
                    'department': emp.department,
                    'contributions': system_data
                })

        # Find employees in file but not in system
        system_employee_ids = {emp.employee_id for emp in employees}
        for file_emp_id in file_employee_ids:
            if file_emp_id not in system_employee_ids:
                missing_in_system.append({
                    'employee_id': file_emp_id,
                    'contributions': file_data[file_emp_id]
                })

        # Calculate summary statistics
        total_uploaded = len(file_data)
        total_compared = len(matches) + len(discrepancies)

        return {
            'summary': {
                'total_uploaded': total_uploaded,
                'total_compared': total_compared,
                'matches': len(matches),
                'discrepancies': len(discrepancies),
                'missing_in_system': len(missing_in_system),
                'missing_in_file': len(missing_in_file),
                'accuracy_rate': round((len(matches) / total_compared * 100) if total_compared > 0 else 0, 2)
            },
            'matches': matches,
            'discrepancies': discrepancies,
            'missing_in_system': missing_in_system,
            'missing_in_file': missing_in_file
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
