"""
Populate ACA Compliance Data with realistic dummy data
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date, timedelta
import random
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db import models

def populate_aca_data():
    """Populate comprehensive ACA compliance data"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("\n🏥 Populating ACA Compliance Data...")
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
        # 1. MONTHLY HOURS DATA
        # ============================================================
        print("\n📊 Populating Monthly Hours Data...")

        monthly_hours_added = 0
        current_year = 2026

        # Generate hours for the past 12 months
        for month_offset in range(12):
            target_date = datetime(current_year, 1, 1) - timedelta(days=month_offset * 30)
            year = target_date.year
            month = target_date.month

            for employee in employees:
                # Check if record already exists
                existing = db.query(models.ACAMonthlyHours).filter(
                    models.ACAMonthlyHours.employee_id == employee.employee_id,
                    models.ACAMonthlyHours.year == year,
                    models.ACAMonthlyHours.month == month
                ).first()

                if existing:
                    continue

                # Determine hours based on employment type
                if employee.employment_type == "Full Time":
                    # Full-time: 140-180 hours typically
                    hours_worked = round(random.uniform(140, 180), 1)
                    hours_of_service = hours_worked + round(random.uniform(0, 16), 1)  # Add PTO/holiday
                elif employee.employment_type == "Part Time":
                    # Part-time: 60-120 hours
                    hours_worked = round(random.uniform(60, 120), 1)
                    hours_of_service = hours_worked + round(random.uniform(0, 8), 1)
                else:
                    # Contract/Intern: variable
                    hours_worked = round(random.uniform(80, 160), 1)
                    hours_of_service = hours_worked

                # ACA full-time = 130+ hours of service per month
                is_full_time = hours_of_service >= 130

                monthly_hours = models.ACAMonthlyHours(
                    employee_id=employee.employee_id,
                    year=year,
                    month=month,
                    hours_worked=hours_worked,
                    hours_of_service=hours_of_service,
                    is_full_time=is_full_time,
                    employment_status="Active",
                    data_source="Payroll Import",
                    imported_date=date.today()
                )
                db.add(monthly_hours)
                monthly_hours_added += 1

        db.commit()
        print(f"✓ Added {monthly_hours_added} monthly hours records")

        # ============================================================
        # 2. COVERAGE OFFERS
        # ============================================================
        print("\n💼 Populating Coverage Offers...")

        coverage_offers_added = 0
        offer_codes = ["1A", "1B", "1C", "1E"]  # Different offer types
        safe_harbor_codes = ["2A", "2B", "2C"]
        plan_names = ["PPO Gold", "HMO Silver", "PPO Bronze", "HDHP"]

        for employee in employees:
            # Only offer coverage to full-time employees
            if employee.employment_type != "Full Time":
                continue

            # Check if already has an offer for 2026
            existing = db.query(models.ACACoverageOffer).filter(
                models.ACACoverageOffer.employee_id == employee.employee_id,
                models.ACACoverageOffer.year == 2026
            ).first()

            if existing:
                continue

            # Create offer
            offer_id = f"ACA-OFFER-2026-{str(coverage_offers_added + 1).zfill(4)}"

            # Most employees get 1A (comprehensive coverage)
            offer_code = random.choices(offer_codes, weights=[70, 15, 10, 5])[0]

            # Employee monthly cost (should be <9.02% of income for affordability)
            # Assuming typical range of $100-$250/month for employee-only
            employee_cost = round(random.uniform(100, 250), 2)

            # 80% of employees accept coverage
            coverage_accepted = random.random() < 0.8

            # Most offers are affordable
            is_affordable = random.random() < 0.95
            affordability_pct = round(random.uniform(5.5, 8.5), 2) if is_affordable else round(random.uniform(9.5, 11.0), 2)

            offer = models.ACACoverageOffer(
                offer_id=offer_id,
                employee_id=employee.employee_id,
                year=2026,
                coverage_start_date=date(2026, 1, 1),
                coverage_end_date=None,
                offer_of_coverage_code=offer_code,
                employee_monthly_cost=employee_cost,
                safe_harbor_code=random.choice(safe_harbor_codes),
                coverage_accepted=coverage_accepted,
                acceptance_date=date(2025, 11, random.randint(15, 30)) if coverage_accepted else None,
                plan_name=random.choice(plan_names) if coverage_accepted else None,
                is_affordable=is_affordable,
                affordability_percentage=affordability_pct,
                affordability_threshold=9.02,  # 2025-2026 threshold
                offer_communication_date=date(2025, 10, random.randint(1, 15)),
                offer_method=random.choice(["Email", "Portal", "Mail"]),
                response_due_date=date(2025, 11, 15)
            )
            db.add(offer)
            coverage_offers_added += 1

        db.commit()
        print(f"✓ Added {coverage_offers_added} coverage offers")

        # ============================================================
        # 3. FORM 1095-C RECORDS
        # ============================================================
        print("\n📋 Populating Form 1095-C Records...")

        forms_added = 0
        tax_years = [2025, 2024]

        for tax_year in tax_years:
            for employee in employees:
                # Only create forms for full-time employees
                if employee.employment_type != "Full Time":
                    continue

                # Check if already exists
                existing = db.query(models.ACAForm1095C).filter(
                    models.ACAForm1095C.employee_id == employee.employee_id,
                    models.ACAForm1095C.tax_year == tax_year
                ).first()

                if existing:
                    continue

                form_id = f"1095C-{tax_year}-{str(forms_added + 1).zfill(4)}"

                # Determine status based on tax year
                if tax_year == 2025:
                    status = random.choice(["Draft", "Ready for Filing"])
                    filed_date = None
                else:  # 2024
                    status = "Filed"
                    filed_date = date(tax_year + 1, 2, random.randint(15, 28))

                # Generate monthly offer data
                offer_code = random.choice(["1A", "1B", "1C"])
                employee_cost = round(random.uniform(100, 250), 2)
                safe_harbor = random.choice(["2A", "2B", "2C"])

                form = models.ACAForm1095C(
                    form_id=form_id,
                    employee_id=employee.employee_id,
                    tax_year=tax_year,
                    employee_name=f"{employee.first_name} {employee.last_name}",
                    employee_address="123 Main St",
                    employee_city="Portland",
                    employee_state="OR",
                    employee_zip="97201",
                    # All 12 months with same offer (simplified)
                    jan_line14=offer_code, jan_line15=employee_cost, jan_line16=safe_harbor,
                    feb_line14=offer_code, feb_line15=employee_cost, feb_line16=safe_harbor,
                    mar_line14=offer_code, mar_line15=employee_cost, mar_line16=safe_harbor,
                    apr_line14=offer_code, apr_line15=employee_cost, apr_line16=safe_harbor,
                    may_line14=offer_code, may_line15=employee_cost, may_line16=safe_harbor,
                    jun_line14=offer_code, jun_line15=employee_cost, jun_line16=safe_harbor,
                    jul_line14=offer_code, jul_line15=employee_cost, jul_line16=safe_harbor,
                    aug_line14=offer_code, aug_line15=employee_cost, aug_line16=safe_harbor,
                    sep_line14=offer_code, sep_line15=employee_cost, sep_line16=safe_harbor,
                    oct_line14=offer_code, oct_line15=employee_cost, oct_line16=safe_harbor,
                    nov_line14=offer_code, nov_line15=employee_cost, nov_line16=safe_harbor,
                    dec_line14=offer_code, dec_line15=employee_cost, dec_line16=safe_harbor,
                    status=status,
                    filed_date=filed_date
                )
                db.add(form)
                forms_added += 1

        db.commit()
        print(f"✓ Added {forms_added} Form 1095-C records")

        # ============================================================
        # 4. COMPLIANCE ALERTS
        # ============================================================
        print("\n⚠ Populating Compliance Alerts...")

        alerts_added = 0

        # Alert 1: Missing hours data
        alert_employees = random.sample(employees, min(3, len(employees)))
        for emp in alert_employees:
            alert = models.ACAAlert(
                alert_id=f"ACA-ALERT-2026-{str(alerts_added + 1).zfill(4)}",
                alert_type="Missing Hours Data",
                severity="High",
                employee_id=emp.employee_id,
                title=f"Missing hours data for {emp.first_name} {emp.last_name}",
                message=f"No hours data recorded for {emp.first_name} {emp.last_name} for December 2025. This may affect ACA reporting.",
                recommended_action="Import December payroll data or manually enter hours worked.",
                status="Active",
                due_date=date(2026, 1, 15)
            )
            db.add(alert)
            alerts_added += 1

        # Alert 2: Approaching full-time status
        pt_employees = [e for e in employees if e.employment_type == "Part Time"]
        if pt_employees:
            for emp in random.sample(pt_employees, min(2, len(pt_employees))):
                alert = models.ACAAlert(
                    alert_id=f"ACA-ALERT-2026-{str(alerts_added + 1).zfill(4)}",
                    alert_type="Approaching FT Status",
                    severity="Medium",
                    employee_id=emp.employee_id,
                    title=f"{emp.first_name} {emp.last_name} approaching full-time status",
                    message=f"Part-time employee {emp.first_name} {emp.last_name} has worked 125+ hours in the last month, approaching the 130-hour ACA full-time threshold.",
                    recommended_action="Review employee's measurement period hours. If averaging 130+ hours, offer coverage or adjust schedule.",
                    status="Active",
                    due_date=date(2026, 2, 1)
                )
                db.add(alert)
                alerts_added += 1

        # Alert 3: Form filing deadline
        alert = models.ACAAlert(
            alert_id=f"ACA-ALERT-2026-{str(alerts_added + 1).zfill(4)}",
            alert_type="Deadline Approaching",
            severity="Critical",
            employee_id=None,
            title="Form 1095-C filing deadline approaching",
            message="IRS deadline for furnishing Form 1095-C to employees is March 3, 2026. 15 forms are still in Draft status.",
            recommended_action="Review and finalize all Form 1095-C records. Ensure employee addresses are current before printing/mailing.",
            status="Active",
            due_date=date(2026, 3, 3)
        )
        db.add(alert)
        alerts_added += 1

        # Alert 4: Affordability concern
        if coverage_offers_added > 0:
            alert = models.ACAAlert(
                alert_id=f"ACA-ALERT-2026-{str(alerts_added + 1).zfill(4)}",
                alert_type="Affordability Issue",
                severity="High",
                employee_id=None,
                title="Coverage affordability review needed",
                message="3 employees have coverage offers that may exceed the 9.02% affordability threshold based on current wages.",
                recommended_action="Review employee wages and coverage costs. Adjust employee contributions or apply safe harbor codes as appropriate.",
                status="Active",
                due_date=date(2026, 1, 31)
            )
            db.add(alert)
            alerts_added += 1

        # Alert 5: ALE status monitoring
        alert = models.ACAAlert(
            alert_id=f"ACA-ALERT-2026-{str(alerts_added + 1).zfill(4)}",
            alert_type="ALE Status",
            severity="Low",
            employee_id=None,
            title="Monitoring ALE status for 2026",
            message=f"Company currently has {len(employees)} active employees. Continue monitoring to ensure compliance with ALE requirements (50+ FTE threshold).",
            recommended_action="Track monthly FTE counts and maintain documentation of measurement period calculations.",
            status="Active",
            due_date=None
        )
        db.add(alert)
        alerts_added += 1

        db.commit()
        print(f"✓ Added {alerts_added} compliance alerts")

        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 60)
        print("✅ ACA Data Population Complete!")
        print("=" * 60)
        print(f"  📊 Monthly Hours Records: {monthly_hours_added}")
        print(f"  💼 Coverage Offers: {coverage_offers_added}")
        print(f"  📋 Form 1095-C Records: {forms_added}")
        print(f"  ⚠  Compliance Alerts: {alerts_added}")
        print("=" * 60)

        # Display some stats
        print("\n📈 ACA Compliance Statistics:")

        # Count full-time employees by month
        current_month_ft = db.query(models.ACAMonthlyHours).filter(
            models.ACAMonthlyHours.year == 2026,
            models.ACAMonthlyHours.month == 1,
            models.ACAMonthlyHours.is_full_time == True
        ).count()

        print(f"  • Full-time employees (Jan 2026): {current_month_ft}")
        print(f"  • Coverage acceptance rate: ~80%")
        print(f"  • Affordability compliance: ~95%")

        total_alerts_active = db.query(models.ACAAlert).filter(
            models.ACAAlert.status == "Active"
        ).count()
        print(f"  • Active compliance alerts: {total_alerts_active}")

        print("\n✓ Ready to view in ACA Compliance Dashboard!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error populating ACA data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    populate_aca_data()
