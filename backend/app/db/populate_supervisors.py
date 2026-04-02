"""
Populate supervisor data for employees.
Assigns department managers and supervisors to employees.
"""
import random
from datetime import date
from app.db import database, models
import logging

logger = logging.getLogger(__name__)

def populate_supervisors():
    db = database.SessionLocal()

    try:
        # Get all active employees grouped by department
        employees = db.query(models.Employee).filter(
            models.Employee.status == "Active"
        ).all()

        if not employees:
            logger.info("No active employees found.")
            return

        # Group employees by department
        dept_employees = {}
        for emp in employees:
            dept = emp.department or "General"
            if dept not in dept_employees:
                dept_employees[dept] = []
            dept_employees[dept].append(emp)

        logger.info(f"Found {len(employees)} active employees across {len(dept_employees)} departments")

        # For each department, assign the most senior employee as the department manager
        department_managers = {}

        for dept, emps in dept_employees.items():
            # Sort by hire date (oldest first) to find most senior
            sorted_emps = sorted(emps, key=lambda e: e.hire_date or date(2020, 1, 1))

            if sorted_emps:
                # Most senior employee becomes department manager
                manager = sorted_emps[0]
                department_managers[dept] = manager

                # Update manager's position to include "Manager" or "Director"
                if manager.position and "Manager" not in manager.position and "Director" not in manager.position:
                    manager.position = f"{dept} Manager"
                elif not manager.position:
                    manager.position = f"{dept} Manager"

                logger.info(f"{dept}: Manager = {manager.first_name} {manager.last_name} (ID: {manager.employee_id})")

        # Now assign supervisors to all employees
        supervisor_count = 0

        for emp in employees:
            dept = emp.department or "General"
            manager = department_managers.get(dept)

            if manager and emp.employee_id != manager.employee_id:
                # Assign department manager as supervisor
                emp.supervisor = f"{manager.first_name} {manager.last_name}"
                supervisor_count += 1

        # Also update terminated employees with supervisors (using their department's manager)
        terminated_employees = db.query(models.Employee).filter(
            models.Employee.status == "Terminated"
        ).all()

        for emp in terminated_employees:
            dept = emp.department or "General"
            manager = department_managers.get(dept)

            if manager:
                emp.supervisor = f"{manager.first_name} {manager.last_name}"
                supervisor_count += 1

        db.commit()

        logger.info(f"\nSuccessfully assigned supervisors to {supervisor_count} employees")
        logger.info(f"Department managers: {len(department_managers)}")

        # Print summary
        logger.info("Department Manager Summary:")
        for dept, manager in sorted(department_managers.items()):
            emp_count = len(dept_employees.get(dept, []))
            logger.info(f"{dept}: {manager.first_name} {manager.last_name} ({emp_count} employees)")

    except Exception as e:
        db.rollback()
        logger.error(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate_supervisors()
