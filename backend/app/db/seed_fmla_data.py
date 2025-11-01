"""Seed FMLA sample data for testing."""
from datetime import date, timedelta
from app.db.database import SessionLocal
from app.db.models import FMLACase, FMLALeaveEntry, Employee
import random


def seed_fmla_data():
    """Create sample FMLA cases for testing."""
    db = SessionLocal()

    try:
        # Check if FMLA data already exists
        existing = db.query(FMLACase).first()
        if existing:
            print("✅ FMLA data already exists")
            return

        # Get some employees
        employees = db.query(Employee).limit(15).all()
        if not employees:
            print("❌ No employees found. Please seed employee data first.")
            return

        leave_types = [
            "Employee Medical",
            "Family Care",
            "Military Family",
            "Bonding"
        ]

        statuses = ["Active", "Pending", "Closed", "Approved"]

        reasons = [
            "Surgery and recovery",
            "Chronic health condition",
            "Birth of child",
            "Care for ill parent",
            "Military family support",
            "Adoption",
            "Serious health condition"
        ]

        # Create 12 FMLA cases
        for i, employee in enumerate(employees[:12]):
            # Randomize dates
            start_offset = random.randint(10, 180)
            start_date = date.today() - timedelta(days=start_offset)

            # Some cases are still active, some are closed
            if i < 4:
                status = "Active"
                end_date = date.today() + timedelta(days=random.randint(10, 60))
            elif i < 7:
                status = "Pending"
                end_date = start_date + timedelta(days=random.randint(20, 84))
            else:
                status = "Closed"
                end_date = start_date + timedelta(days=random.randint(14, 84))

            # Intermittent or continuous
            intermittent = i % 3 == 0
            reduced_schedule = i % 4 == 0

            # Hours tracking
            hours_approved = 480.0
            hours_used = random.uniform(40, 400) if status != "Pending" else 0
            hours_remaining = hours_approved - hours_used

            case_number = f"FMLA-2025-{(i+1):04d}"

            fmla_case = FMLACase(
                case_number=case_number,
                employee_id=employee.employee_id,
                status=status,
                leave_type=random.choice(leave_types),
                reason=random.choice(reasons),
                request_date=start_date - timedelta(days=7),
                start_date=start_date,
                end_date=end_date if status != "Pending" else None,
                certification_date=start_date if status != "Pending" else None,
                hours_approved=hours_approved,
                hours_used=hours_used,
                hours_remaining=hours_remaining,
                intermittent=intermittent,
                reduced_schedule=reduced_schedule,
                notes=f"Sample FMLA case for {employee.first_name} {employee.last_name}",
            )

            db.add(fmla_case)
            db.flush()  # Get the case ID

            # Add some leave entries for active/closed cases
            if status in ["Active", "Closed"]:
                num_entries = random.randint(3, 10)
                total_hours = 0

                for j in range(num_entries):
                    leave_date = start_date + timedelta(days=j*7)  # Weekly entries
                    if leave_date > date.today():
                        break

                    hours = random.uniform(4, 40)
                    total_hours += hours

                    if total_hours > hours_used:
                        hours = hours_used - (total_hours - hours)

                    entry_types = ["Full Day", "Partial Day", "Intermittent"]

                    entry = FMLALeaveEntry(
                        case_id=fmla_case.id,
                        leave_date=leave_date,
                        hours_taken=hours,
                        entry_type=random.choice(entry_types),
                        notes=f"Leave entry {j+1}",
                    )

                    db.add(entry)

        db.commit()
        print("✅ Successfully created 12 sample FMLA cases with leave entries")

    except Exception as e:
        print(f"❌ Error seeding FMLA data: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_fmla_data()
