"""
Fix test data for Employee Portal demonstration.
- Populate annual_wage from wage where missing
- Set up proper supervisor relationships for test_supervisor
- Ensure all demo accounts have complete data
"""
from app.db import database, models

def fix_test_data():
    db = database.SessionLocal()

    try:
        # 1. Populate annual_wage from wage where missing
        employees = db.query(models.Employee).filter(
            models.Employee.annual_wage == None,
            models.Employee.wage != None
        ).all()

        wage_updates = 0
        for emp in employees:
            emp.annual_wage = emp.wage
            wage_updates += 1

        print(f"Updated annual_wage for {wage_updates} employees")

        # 2. Set up test_supervisor (James Morales, C13) as a supervisor with direct reports
        test_supervisor_user = db.query(models.User).filter(
            models.User.username == 'test_supervisor'
        ).first()

        if test_supervisor_user and test_supervisor_user.employee_id:
            supervisor_emp = db.query(models.Employee).filter(
                models.Employee.employee_id == test_supervisor_user.employee_id
            ).first()

            if supervisor_emp:
                supervisor_name = f"{supervisor_emp.first_name} {supervisor_emp.last_name}"
                supervisor_dept = supervisor_emp.department or "IT"

                # Make this employee a supervisor/manager
                if not supervisor_emp.position or 'Manager' not in supervisor_emp.position:
                    supervisor_emp.position = f"{supervisor_dept} Team Lead"

                # Assign some employees from the same department as direct reports
                potential_reports = db.query(models.Employee).filter(
                    models.Employee.department == supervisor_dept,
                    models.Employee.status == "Active",
                    models.Employee.employee_id != supervisor_emp.employee_id,
                    models.Employee.supervisor != supervisor_name
                ).limit(5).all()

                for report in potential_reports:
                    report.supervisor = supervisor_name
                    print(f"  Assigned {report.first_name} {report.last_name} to {supervisor_name}")

                print(f"Set up {len(potential_reports)} direct reports for test_supervisor ({supervisor_name})")

        # 3. Verify test_employee (Margaret Harris) has all required data
        test_employee_user = db.query(models.User).filter(
            models.User.username == 'test_employee'
        ).first()

        if test_employee_user and test_employee_user.employee_id:
            test_emp = db.query(models.Employee).filter(
                models.Employee.employee_id == test_employee_user.employee_id
            ).first()

            if test_emp:
                print(f"\ntest_employee data ({test_emp.first_name} {test_emp.last_name}):")
                print(f"  wage: {test_emp.wage}")
                print(f"  annual_wage: {test_emp.annual_wage}")
                print(f"  department: {test_emp.department}")
                print(f"  position: {test_emp.position}")

                # Ensure annual_wage is set
                if test_emp.annual_wage is None and test_emp.wage:
                    test_emp.annual_wage = test_emp.wage
                    print(f"  -> Set annual_wage to {test_emp.wage}")

        # 4. Ensure test_supervisor_employee also has proper setup
        test_sup_emp_user = db.query(models.User).filter(
            models.User.username == 'test_supervisor_employee'
        ).first()

        if test_sup_emp_user and test_sup_emp_user.employee_id:
            sup_emp = db.query(models.Employee).filter(
                models.Employee.employee_id == test_sup_emp_user.employee_id
            ).first()

            if sup_emp:
                supervisor_name = f"{sup_emp.first_name} {sup_emp.last_name}"
                dept = sup_emp.department or "General"

                # Check for existing direct reports
                existing_reports = db.query(models.Employee).filter(
                    models.Employee.supervisor == supervisor_name
                ).count()

                if existing_reports == 0:
                    # Assign some employees as direct reports
                    potential_reports = db.query(models.Employee).filter(
                        models.Employee.department == dept,
                        models.Employee.status == "Active",
                        models.Employee.employee_id != sup_emp.employee_id
                    ).limit(3).all()

                    for report in potential_reports:
                        report.supervisor = supervisor_name

                    print(f"\nSet up {len(potential_reports)} direct reports for test_supervisor_employee ({supervisor_name})")

        db.commit()
        print("\nTest data fixes applied successfully!")

        # Print summary of test accounts
        print("\n" + "="*60)
        print("TEST ACCOUNT SUMMARY")
        print("="*60)

        for username in ['test_employee', 'test_supervisor', 'test_supervisor_employee']:
            user = db.query(models.User).filter(models.User.username == username).first()
            if user and user.employee_id:
                emp = db.query(models.Employee).filter(
                    models.Employee.employee_id == user.employee_id
                ).first()
                if emp:
                    reports_count = db.query(models.Employee).filter(
                        models.Employee.supervisor == f"{emp.first_name} {emp.last_name}"
                    ).count()

                    print(f"\n{username}:")
                    print(f"  Employee: {emp.first_name} {emp.last_name} ({emp.employee_id})")
                    print(f"  Role: {user.role}")
                    print(f"  Department: {emp.department}")
                    print(f"  Position: {emp.position}")
                    print(f"  Annual Wage: ${emp.annual_wage:,.2f}" if emp.annual_wage else "  Annual Wage: Not set")
                    print(f"  Direct Reports: {reports_count}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_test_data()
