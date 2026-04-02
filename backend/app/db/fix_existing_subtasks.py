"""
Fix existing offboarding tasks to properly set parent_task_id, has_subtasks, and is_subtask flags
This script identifies subtasks based on task names and updates the database accordingly
"""
import logging
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

logger = logging.getLogger(__name__)

def fix_existing_subtasks():
    """Identify and fix subtask relationships for existing tasks"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    try:
        logger.info("Fixing existing offboarding task relationships...")
        logger.info("=" * 60)

        with engine.connect() as connection:
            # Get all offboarding tasks
            result = connection.execute(text("""
                SELECT id, task_name, employee_id, parent_task_id, has_subtasks, is_subtask
                FROM offboarding_tasks
                ORDER BY employee_id, id
            """))
            all_tasks = result.fetchall()

            if not all_tasks:
                logger.info("No offboarding tasks found.")
                return

            logger.info(f"Found {len(all_tasks)} tasks to analyze...")

            # Parent task names that should have subtasks
            parent_task_names = [
                "Fill out exit documents",
                "Equipment to Return?",
                "Send NBS Term Emails"
            ]

            # Subtask indicators (tasks that are always subtasks)
            subtask_indicators = [
                "Equitable Portability Form",
                "Equitable Conversion Form",
                "Important Information for Terminating Employee Form",
                "Important information for terminating employee Form",
                "Non-Solicitation and Confidentiality Document",
                "Request Return Label",
                "Request return label",
                "Send Return Label to Employee",
                "Send return label to employee",
                "Leadership Notification",
                "Retirement Notification",
                "Flexible Benefits Notification",
                "Welfare Notification",
                "COBRA Notification",
                "Accounting Notification",
                "Data Administration Notification",
                "CRM Notification",
                "401(k) Notification",
                "Concur Travel Notification"
            ]

            updates_made = 0

            # Group tasks by employee
            tasks_by_employee = {}
            for task in all_tasks:
                emp_id = task[2]
                if emp_id not in tasks_by_employee:
                    tasks_by_employee[emp_id] = []
                tasks_by_employee[emp_id].append(task)

            # Process each employee's tasks
            for emp_id, emp_tasks in tasks_by_employee.items():
                logger.info(f"Processing employee {emp_id}...")

                # Find parent tasks
                for task in emp_tasks:
                    task_id, task_name = task[0], task[1]

                    # Mark parent tasks that should have subtasks
                    if any(parent_name.lower() == task_name.lower() for parent_name in parent_task_names):
                        connection.execute(text("""
                            UPDATE offboarding_tasks
                            SET has_subtasks = 1, is_subtask = 0
                            WHERE id = :task_id
                        """), {"task_id": task_id})
                        logger.info(f"Marked '{task_name}' as parent task (has_subtasks)")
                        updates_made += 1

                # Find and link subtasks
                parent_task_map = {}
                for task in emp_tasks:
                    task_id, task_name = task[0], task[1]
                    if any(parent_name.lower() == task_name.lower() for parent_name in parent_task_names):
                        parent_task_map[task_name.lower()] = task_id

                for task in emp_tasks:
                    task_id, task_name = task[0], task[1]

                    # Check if this is a subtask
                    if any(indicator.lower() in task_name.lower() for indicator in subtask_indicators):
                        # Determine parent based on task name
                        parent_id = None
                        if any(x in task_name.lower() for x in ["equitable", "important information", "non-solicitation"]):
                            parent_id = parent_task_map.get("fill out exit documents")
                        elif any(x in task_name.lower() for x in ["return label", "request return"]):
                            parent_id = parent_task_map.get("equipment to return?")
                        elif any(x in task_name.lower() for x in ["notification"]):
                            parent_id = parent_task_map.get("send nbs term emails")

                        if parent_id:
                            connection.execute(text("""
                                UPDATE offboarding_tasks
                                SET parent_task_id = :parent_id, is_subtask = 1, has_subtasks = 0
                                WHERE id = :task_id
                            """), {"parent_id": parent_id, "task_id": task_id})
                            logger.info(f"Linked subtask '{task_name}' to parent")
                            updates_made += 1

            connection.commit()

            logger.info("=" * 60)
            logger.info(f"Migration completed! Made {updates_made} updates.")
            logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error fixing subtask relationships: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    fix_existing_subtasks()
