"""Create offboarding tasks for terminated employees who don't have them yet"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db import models
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)


def create_missing_offboarding_tasks():
    """Create offboarding tasks for terminated employees who don't have them"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find all employees with termination dates but no offboarding tasks
        employees = db.query(models.Employee).filter(
            models.Employee.termination_date.isnot(None)
        ).all()

        logger.info(f"Found {len(employees)} employees with termination dates")

        created_count = 0

        # Get global task counter once at the start
        year = datetime.now().year
        # Find the highest task number
        max_task_id = db.query(models.OffboardingTask.task_id).filter(
            models.OffboardingTask.task_id.like(f"OFF-TASK-{year}-%")
        ).order_by(models.OffboardingTask.task_id.desc()).first()

        if max_task_id and max_task_id[0]:
            # Extract the numeric part from 'OFF-TASK-2025-0134'
            task_counter = int(max_task_id[0].split('-')[-1])
        else:
            task_counter = 0

        for employee in employees:
            # Check if they already have offboarding tasks
            existing_tasks = db.query(models.OffboardingTask).filter(
                models.OffboardingTask.employee_id == employee.employee_id
            ).first()

            if existing_tasks:
                logger.info(f"{employee.first_name} {employee.last_name} ({employee.employee_id}) - tasks already exist")
                continue

            logger.info(f"Creating tasks for {employee.first_name} {employee.last_name} ({employee.employee_id})...")

            # Load the default offboarding checklist
            config_path = os.path.join(os.path.dirname(__file__), "..", "config", "default_offboarding_checklist.json")
            with open(config_path, 'r') as f:
                checklist = json.load(f)
            all_tasks = checklist["tasks"]

            # Determine employment type
            employment_type = employee.employment_type if hasattr(employee, 'employment_type') and employee.employment_type else "Full Time"
            termination_type = "Voluntary"  # Default

            # Filter tasks based on employee attributes
            filtered_tasks = []
            for task in all_tasks:
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
                    employee_id=employee.employee_id,
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
                            employee_id=employee.employee_id,
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

            # Also ensure employee status is "Terminated"
            if employee.status != "Terminated":
                employee.status = "Terminated"

            db.commit()
            created_count += 1
            logger.info(f"Created offboarding tasks for {employee.first_name} {employee.last_name}")

        logger.info(f"\n Successfully created offboarding tasks for {created_count} employees")

    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Creating missing offboarding tasks...")
    logger.info("=" * 60)
    create_missing_offboarding_tasks()
