"""
Populate Overtime/PTO Data with realistic dummy data
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date, timedelta
import random
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db import models

def populate_overtime_data():
    """Populate comprehensive overtime/PTO tracking data"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("\n⏰ Populating Overtime Tracking Data...")
        print("=" * 60)

        # Get all active employees
        employees = db.query(models.Employee).filter(
            models.Employee.status == "Active"
        ).all()

        if not employees:
            print("⚠ No active employees found. Please populate employees first.")
            return

        print(f"✓ Found {len(employees)} active employees")

        # ============================================================
        # OVERTIME/PTO RECORDS
        # ============================================================
        print("\n📊 Populating Overtime Records...")

        records_added = 0
        current_year = 2025

        # Generate bi-weekly pay periods for the past 6 months
        pay_periods = []
        start_date = date(2024, 7, 1)  # July 1, 2024
        current_date = date.today()

        while start_date <= current_date:
            pay_periods.append(start_date)
            start_date += timedelta(days=14)  # Bi-weekly

        print(f"✓ Generating data for {len(pay_periods)} pay periods")

        # Categorize employees by type for realistic overtime distribution
        hourly_employees = [e for e in employees if e.wage_type == "Hourly"]
        salary_employees = [e for e in employees if e.wage_type == "Salary"]

        print(f"  • Hourly employees: {len(hourly_employees)}")
        print(f"  • Salary employees: {len(salary_employees)}")

        # Hourly employees have more frequent overtime
        for pay_period in pay_periods:
            # 60% of hourly employees work overtime in any given pay period
            overtime_workers = random.sample(
                hourly_employees,
                k=min(int(len(hourly_employees) * 0.6), len(hourly_employees))
            )

            for employee in overtime_workers:
                # Check if record already exists
                existing = db.query(models.PTORecord).filter(
                    models.PTORecord.employee_id == employee.employee_id,
                    models.PTORecord.pay_period_date == pay_period
                ).first()

                if existing:
                    continue

                # Determine overtime hours (typically 2-20 hours per pay period)
                # More senior/higher paid employees tend to work more overtime
                base_hours = random.uniform(2, 20)

                # Adjust based on employee characteristics
                if employee.department in ["Operations", "Manufacturing", "Warehouse"]:
                    ot_hours = base_hours * random.uniform(1.2, 1.8)  # More OT in operations
                elif employee.department in ["Engineering", "IT"]:
                    ot_hours = base_hours * random.uniform(0.8, 1.4)  # Moderate OT
                else:
                    ot_hours = base_hours * random.uniform(0.5, 1.0)  # Less OT

                ot_hours = round(ot_hours, 2)

                # Calculate OT cost (time-and-a-half)
                hourly_rate = employee.hourly_wage or 0
                if hourly_rate == 0 and employee.annual_wage:
                    # Estimate hourly from annual
                    hourly_rate = employee.annual_wage / 2080

                ot_rate = hourly_rate * 1.5
                ot_cost = round(ot_hours * ot_rate, 2)

                # Determine cost center
                cost_center = employee.cost_center or employee.department or "Unknown"

                # Create record
                record = models.PTORecord(
                    employee_id=employee.employee_id,
                    cost_center=cost_center,
                    pay_period_date=pay_period,
                    pto_hours=ot_hours,
                    pto_cost=ot_cost,
                    hourly_rate=ot_rate
                )
                db.add(record)
                records_added += 1

        # Salary employees occasionally work overtime (paid at straight time, not time-and-a-half)
        for pay_period in pay_periods:
            # Only 15% of salary employees get paid overtime in any given period
            overtime_workers = random.sample(
                salary_employees,
                k=min(int(len(salary_employees) * 0.15), len(salary_employees))
            )

            for employee in overtime_workers:
                # Check if record already exists
                existing = db.query(models.PTORecord).filter(
                    models.PTORecord.employee_id == employee.employee_id,
                    models.PTORecord.pay_period_date == pay_period
                ).first()

                if existing:
                    continue

                # Salaried overtime is typically less frequent and less hours
                ot_hours = round(random.uniform(1, 8), 2)

                # Calculate straight-time rate
                hourly_rate = employee.hourly_wage or (employee.annual_wage / 2080 if employee.annual_wage else 0)
                ot_cost = round(ot_hours * hourly_rate, 2)

                cost_center = employee.cost_center or employee.department or "Unknown"

                record = models.PTORecord(
                    employee_id=employee.employee_id,
                    cost_center=cost_center,
                    pay_period_date=pay_period,
                    pto_hours=ot_hours,
                    pto_cost=ot_cost,
                    hourly_rate=hourly_rate,
                    notes="Salaried - straight time"
                )
                db.add(record)
                records_added += 1

        db.commit()
        print(f"✓ Added {records_added} overtime records")

        # ============================================================
        # IMPORT HISTORY
        # ============================================================
        print("\n📝 Creating Import History...")

        # Add a few import history records to show the system has been used
        import_dates = [
            date(2024, 7, 15),
            date(2024, 8, 15),
            date(2024, 9, 15),
            date(2024, 10, 15),
            date(2024, 11, 15),
            date(2024, 12, 15)
        ]

        for import_date in import_dates:
            # Calculate records in this import
            records_in_period = db.query(models.PTORecord).filter(
                models.PTORecord.pay_period_date >= import_date - timedelta(days=30),
                models.PTORecord.pay_period_date <= import_date
            ).count()

            if records_in_period == 0:
                continue

            import_history = models.PTOImportHistory(
                file_name=f"OT_Earnings_{import_date.strftime('%Y%m%d')}.xlsx",
                imported_by=random.choice(["HR Manager", "Payroll Admin", "System Administrator"]),
                records_imported=records_in_period,
                start_date=import_date - timedelta(days=13),
                end_date=import_date,
                notes=f"Imported {records_in_period} records successfully",
                status="success",
                import_date=datetime.combine(import_date, datetime.min.time())
            )
            db.add(import_history)

        db.commit()

        import_history_count = db.query(models.PTOImportHistory).count()
        print(f"✓ Added {import_history_count} import history records")

        # ============================================================
        # SUMMARY STATISTICS
        # ============================================================
        print("\n" + "=" * 60)
        print("✅ Overtime Data Population Complete!")
        print("=" * 60)
        print(f"  ⏰ Overtime Records: {records_added}")
        print(f"  📝 Import History: {import_history_count}")
        print(f"  📅 Pay Periods Covered: {len(pay_periods)}")
        print("=" * 60)

        # Display some statistics
        print("\n📈 Overtime Statistics:")

        from sqlalchemy import func as sql_func
        total_ot_hours = db.query(sql_func.sum(models.PTORecord.pto_hours)).scalar() or 0
        total_ot_cost = db.query(sql_func.sum(models.PTORecord.pto_cost)).scalar() or 0

        print(f"  • Total OT Hours: {round(total_ot_hours, 2):,}")
        print(f"  • Total OT Cost: ${round(total_ot_cost, 2):,}")

        # Top cost centers by OT
        top_cost_centers = db.query(
            models.PTORecord.cost_center,
            sql_func.sum(models.PTORecord.pto_cost).label('total_cost')
        ).group_by(
            models.PTORecord.cost_center
        ).order_by(
            sql_func.sum(models.PTORecord.pto_cost).desc()
        ).limit(5).all()

        if top_cost_centers:
            print("\n  Top 5 Cost Centers by OT Cost:")
            for cc, cost in top_cost_centers:
                print(f"    • {cc}: ${round(cost, 2):,}")

        print("\n✓ Ready to view in Overtime Tracking page!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error populating overtime data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    populate_overtime_data()
