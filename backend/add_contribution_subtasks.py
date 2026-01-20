"""
Script to add contribution subtasks to existing payroll periods.
Run this once to update all existing periods with the new subtasks.
"""

import sys
sys.path.insert(0, '.')

from app.db.database import SessionLocal
from app.db import models

def add_contribution_subtasks():
    """Add DCAP, FSA, LFSA, HSA, HRA subtasks to all existing 'Reconcile and Upload Contributions' tasks"""

    db = SessionLocal()

    try:
        # Find all "Reconcile and Upload Contributions" tasks
        parent_tasks = db.query(models.PayrollTask).filter(
            models.PayrollTask.title == 'Reconcile and Upload Contributions',
            models.PayrollTask.task_type == 'main'
        ).all()

        print(f"Found {len(parent_tasks)} 'Reconcile and Upload Contributions' tasks to update")

        subtask_definitions = [
            ('DCAP', 'Reconcile DCAP contribution amounts and upload to provider.'),
            ('FSA', 'Reconcile FSA contribution amounts and upload to provider.'),
            ('LFSA', 'Reconcile LFSA contribution amounts and upload to provider.'),
            ('HSA', 'Reconcile HSA contribution amounts and upload to provider.'),
            ('HRA (first check of the month only)', 'Reconcile HRA contribution amounts and upload to provider. Only applicable for the first payroll of each month.'),
        ]

        for parent_task in parent_tasks:
            # Check if subtasks already exist
            existing_subtasks = db.query(models.PayrollTask).filter(
                models.PayrollTask.parent_task_id == parent_task.id
            ).count()

            if existing_subtasks > 0:
                print(f"  Period {parent_task.payroll_period_id}: Already has {existing_subtasks} subtasks, skipping")
                continue

            # Get the max order_index for this period to continue from there
            max_order = db.query(models.PayrollTask.order_index).filter(
                models.PayrollTask.payroll_period_id == parent_task.payroll_period_id
            ).order_by(models.PayrollTask.order_index.desc()).first()

            next_order = (max_order[0] + 1) if max_order else parent_task.order_index + 1

            # Create subtasks
            for title, instructions in subtask_definitions:
                subtask = models.PayrollTask(
                    payroll_period_id=parent_task.payroll_period_id,
                    parent_task_id=parent_task.id,
                    title=title,
                    task_type='sub',
                    order_index=next_order,
                    instructions=instructions,
                    completed=False
                )
                db.add(subtask)
                next_order += 1

            print(f"  Period {parent_task.payroll_period_id}: Added 5 subtasks")

        db.commit()
        print("\n✅ Successfully added contribution subtasks to all periods!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_contribution_subtasks()
