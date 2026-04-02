#!/usr/bin/env python3
"""Create demo data for the Capitalized Labor Management page.

This script creates:
1. Projects (mix of capitalizable and non-capitalizable)
2. Pay periods for 2025
3. Timesheets for employees
4. Employee labor rates from compensation data
5. Time entries for various projects
6. Employee capitalization summaries
7. Sample CSV files for upload demonstration
"""

import os
import sys
import random
import csv
from datetime import date, datetime, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from db.database import Base, engine
from db import models
import logging

logger = logging.getLogger(__name__)


def create_projects(db):
    """Create a mix of capitalizable and non-capitalizable projects."""
    logger.info("--- Creating Projects ---")

    projects_data = [
        # Capitalizable software development projects
        {
            "project_code": "PROJ-2025-001",
            "project_name": "Customer Portal Redesign",
            "description": "Complete redesign of the customer-facing portal with new features",
            "is_capitalizable": True,
            "capitalization_type": "software_development",
            "capitalization_start_date": date(2025, 1, 1),
            "capitalization_end_date": None,
            "department": "Engineering",
            "cost_center": "CC-ENG-001",
            "total_budget": 500000.00,
            "labor_budget": 400000.00,
            "status": "active",
            "start_date": date(2025, 1, 1),
            "amortization_period_months": 36,
        },
        {
            "project_code": "PROJ-2025-002",
            "project_name": "Mobile App Development",
            "description": "Native mobile application for iOS and Android",
            "is_capitalizable": True,
            "capitalization_type": "software_development",
            "capitalization_start_date": date(2025, 2, 1),
            "capitalization_end_date": None,
            "department": "Engineering",
            "cost_center": "CC-ENG-002",
            "total_budget": 750000.00,
            "labor_budget": 600000.00,
            "status": "active",
            "start_date": date(2025, 2, 1),
            "amortization_period_months": 36,
        },
        {
            "project_code": "PROJ-2025-003",
            "project_name": "Data Analytics Platform",
            "description": "Internal data analytics and reporting platform",
            "is_capitalizable": True,
            "capitalization_type": "software_development",
            "capitalization_start_date": date(2025, 1, 15),
            "capitalization_end_date": None,
            "department": "Data Science",
            "cost_center": "CC-DS-001",
            "total_budget": 350000.00,
            "labor_budget": 300000.00,
            "status": "active",
            "start_date": date(2025, 1, 15),
            "amortization_period_months": 36,
        },
        {
            "project_code": "PROJ-2025-004",
            "project_name": "ERP System Enhancement",
            "description": "Major enhancements to internal ERP system",
            "is_capitalizable": True,
            "capitalization_type": "software_development",
            "capitalization_start_date": date(2025, 3, 1),
            "capitalization_end_date": None,
            "department": "IT",
            "cost_center": "CC-IT-001",
            "total_budget": 450000.00,
            "labor_budget": 380000.00,
            "status": "active",
            "start_date": date(2025, 3, 1),
            "amortization_period_months": 60,
        },
        # Non-capitalizable projects (maintenance, support, etc.)
        {
            "project_code": "PROJ-2025-100",
            "project_name": "System Maintenance",
            "description": "Ongoing system maintenance and bug fixes",
            "is_capitalizable": False,
            "capitalization_type": None,
            "department": "IT",
            "cost_center": "CC-IT-002",
            "total_budget": 100000.00,
            "labor_budget": 80000.00,
            "status": "active",
            "start_date": date(2025, 1, 1),
        },
        {
            "project_code": "PROJ-2025-101",
            "project_name": "Customer Support",
            "description": "Customer support and issue resolution",
            "is_capitalizable": False,
            "capitalization_type": None,
            "department": "Support",
            "cost_center": "CC-SUP-001",
            "total_budget": 150000.00,
            "labor_budget": 120000.00,
            "status": "active",
            "start_date": date(2025, 1, 1),
        },
        {
            "project_code": "PROJ-2025-102",
            "project_name": "Training & Documentation",
            "description": "Employee training and documentation updates",
            "is_capitalizable": False,
            "capitalization_type": None,
            "department": "HR",
            "cost_center": "CC-HR-001",
            "total_budget": 50000.00,
            "labor_budget": 40000.00,
            "status": "active",
            "start_date": date(2025, 1, 1),
        },
        {
            "project_code": "PROJ-2025-103",
            "project_name": "Administrative Tasks",
            "description": "General administrative and overhead activities",
            "is_capitalizable": False,
            "capitalization_type": None,
            "department": "Operations",
            "cost_center": "CC-OPS-001",
            "total_budget": 75000.00,
            "labor_budget": 60000.00,
            "status": "active",
            "start_date": date(2025, 1, 1),
        },
    ]

    created_count = 0
    for proj_data in projects_data:
        existing = db.query(models.Project).filter(
            models.Project.project_code == proj_data["project_code"]
        ).first()

        if not existing:
            project = models.Project(**proj_data)
            db.add(project)
            created_count += 1
            logger.info(f"Created project: {proj_data['project_code']} - {proj_data['project_name']}")
        else:
            logger.info(f"Project already exists: {proj_data['project_code']}")

    db.commit()
    logger.info(f"Total projects created: {created_count}")
    return db.query(models.Project).all()


def create_pay_periods(db):
    """Create pay periods for 2025 (bi-weekly)."""
    logger.info("--- Creating Pay Periods ---")

    year = 2025
    # Start from the first Monday of January 2025
    start = date(2025, 1, 6)  # Monday, Jan 6, 2025

    periods_created = 0
    for period_num in range(1, 27):  # 26 bi-weekly periods
        period_start = start + timedelta(days=(period_num - 1) * 14)
        period_end = period_start + timedelta(days=13)
        pay_date = period_end + timedelta(days=5)  # Paid Friday after period ends

        existing = db.query(models.PayPeriod).filter(
            models.PayPeriod.year == year,
            models.PayPeriod.period_number == period_num
        ).first()

        if not existing:
            period = models.PayPeriod(
                period_number=period_num,
                year=year,
                start_date=period_start,
                end_date=period_end,
                pay_date=pay_date,
                status="locked" if period_num <= 23 else "open"  # First 23 periods locked
            )
            db.add(period)
            periods_created += 1

    db.commit()
    logger.info(f"Pay periods created: {periods_created}")
    return db.query(models.PayPeriod).filter(models.PayPeriod.year == year).all()


def create_labor_rates(db, employees):
    """Create labor rates from employee compensation data."""
    logger.info("--- Creating Employee Labor Rates ---")

    rates_created = 0
    for emp in employees:
        # Check if rate already exists for this employee
        existing = db.query(models.EmployeeLaborRate).filter(
            models.EmployeeLaborRate.employee_id == emp.id,
            models.EmployeeLaborRate.end_date.is_(None)
        ).first()

        if existing:
            logger.info(f"Rate already exists for: {emp.first_name} {emp.last_name}")
            continue

        # Calculate hourly rate from compensation
        if emp.hourly_wage and emp.hourly_wage > 0:
            hourly_rate = emp.hourly_wage
        elif emp.annual_wage and emp.annual_wage > 0:
            hourly_rate = emp.annual_wage / 2080  # Standard work hours per year
        else:
            hourly_rate = 35.00  # Default if no compensation data

        # Calculate benefits burden
        if emp.benefits_cost_annual and emp.benefits_cost_annual > 0:
            benefits_hourly = emp.benefits_cost_annual / 2080
        else:
            benefits_hourly = hourly_rate * 0.25  # Estimate 25% if no data

        # Calculate employer taxes (FICA 7.65% + FUTA/SUTA ~3%)
        if emp.employer_taxes_annual and emp.employer_taxes_annual > 0:
            taxes_hourly = emp.employer_taxes_annual / 2080
        else:
            taxes_hourly = hourly_rate * 0.1065

        # Overhead allocation (15% of base)
        overhead_hourly = hourly_rate * 0.15

        # Calculate fully burdened rate
        fully_burdened = hourly_rate + benefits_hourly + taxes_hourly + overhead_hourly

        rate = models.EmployeeLaborRate(
            employee_id=emp.id,
            effective_date=date(2025, 1, 1),
            hourly_rate=round(hourly_rate, 2),
            overtime_multiplier=1.5,
            benefits_hourly=round(benefits_hourly, 2),
            benefits_percentage=round((benefits_hourly / hourly_rate) * 100, 2) if hourly_rate > 0 else 25.0,
            employer_taxes_hourly=round(taxes_hourly, 2),
            employer_taxes_percentage=10.65,
            overhead_rate_hourly=round(overhead_hourly, 2),
            overhead_rate_percentage=15.0,
            fully_burdened_rate=round(fully_burdened, 2),
            rate_source="calculated",
            calculation_methodology="Calculated from employee compensation: base + benefits + employer_taxes + overhead (15%)",
            is_locked=False
        )
        db.add(rate)
        rates_created += 1
        logger.info(f"Created rate for {emp.first_name} {emp.last_name}: ${round(hourly_rate, 2)}/hr -> ${round(fully_burdened, 2)}/hr fully burdened")

    db.commit()
    logger.info(f"Total labor rates created: {rates_created}")
    return db.query(models.EmployeeLaborRate).all()


def create_timesheets_and_entries(db, employees, pay_periods, projects, labor_rates):
    """Create timesheets and time entries for employees."""
    logger.info("--- Creating Timesheets and Time Entries ---")

    # Get rates by employee ID
    rates_by_emp = {r.employee_id: r for r in labor_rates}

    # Get capitalizable and non-capitalizable projects
    cap_projects = [p for p in projects if p.is_capitalizable]
    non_cap_projects = [p for p in projects if not p.is_capitalizable]

    timesheets_created = 0
    entries_created = 0

    # Create timesheets for each employee for each pay period
    for emp in employees:
        rate = rates_by_emp.get(emp.id)
        if not rate:
            continue

        # Determine employee's primary project based on department
        if emp.department in ["Engineering", "IT", "Data Science", "Technology"]:
            # Technical staff - mostly capitalizable work
            cap_weight = 0.7  # 70% time on capitalizable projects
        else:
            # Non-technical staff - mostly non-capitalizable work
            cap_weight = 0.2  # 20% time on capitalizable projects

        for period in pay_periods[:23]:  # First 23 pay periods (through November)
            # Check if timesheet exists
            existing = db.query(models.Timesheet).filter(
                models.Timesheet.employee_id == emp.id,
                models.Timesheet.pay_period_id == period.id
            ).first()

            if existing:
                continue

            # Generate random hours with some variation
            base_hours = 80  # Standard bi-weekly hours
            variation = random.uniform(-4, 8)  # Some OT possibility
            total_hours = round(base_hours + variation, 1)
            regular_hours = min(total_hours, 80)
            overtime_hours = max(0, total_hours - 80)

            timesheet = models.Timesheet(
                employee_id=emp.id,
                pay_period_id=period.id,
                total_hours=total_hours,
                regular_hours=regular_hours,
                overtime_hours=overtime_hours,
                status="approved",
                submitted_at=datetime.combine(period.end_date, datetime.min.time()),
                approved_at=datetime.combine(period.end_date + timedelta(days=2), datetime.min.time()),
                approved_by_id=1  # Admin user
            )
            db.add(timesheet)
            db.flush()  # Get the timesheet ID
            timesheets_created += 1

            # Distribute hours across projects
            remaining_hours = total_hours
            work_date = period.start_date

            while remaining_hours > 0 and work_date <= period.end_date:
                # Skip weekends
                if work_date.weekday() >= 5:
                    work_date += timedelta(days=1)
                    continue

                # Daily hours (6-9 hours typically)
                daily_hours = min(remaining_hours, random.uniform(7, 9))

                # Decide on capitalizable vs non-capitalizable split for the day
                if random.random() < cap_weight and cap_projects:
                    project = random.choice(cap_projects)
                    is_capitalizable = True
                    labor_type = random.choice(["direct", "direct", "direct", "indirect"])
                else:
                    project = random.choice(non_cap_projects)
                    is_capitalizable = False
                    labor_type = random.choice(["indirect", "overhead", "overhead"])

                # Check if this is overtime
                is_overtime = regular_hours >= 80 and remaining_hours <= overtime_hours

                # Calculate cost
                if is_overtime:
                    entry_cost = daily_hours * rate.fully_burdened_rate * rate.overtime_multiplier
                else:
                    entry_cost = daily_hours * rate.fully_burdened_rate

                entry = models.TimeEntry(
                    timesheet_id=timesheet.id,
                    employee_id=emp.id,
                    project_id=project.id,
                    work_date=work_date,
                    hours=round(daily_hours, 2),
                    labor_type=labor_type,
                    is_overtime=is_overtime,
                    task_description=f"Work on {project.project_name}",
                    is_capitalizable=is_capitalizable and project.is_capitalizable,
                    capitalization_category=project.capitalization_type if is_capitalizable else None,
                    labor_rate_at_entry=rate.fully_burdened_rate,
                    fully_burdened_cost=round(entry_cost, 2),
                    is_approved=True
                )
                db.add(entry)
                entries_created += 1

                remaining_hours -= daily_hours
                work_date += timedelta(days=1)

    db.commit()
    logger.info(f"Timesheets created: {timesheets_created}")
    logger.info(f"Time entries created: {entries_created}")


def create_capitalization_summaries(db):
    """Create employee capitalization summaries for each period."""
    logger.info("--- Creating Capitalization Summaries ---")

    # Get capitalization periods
    periods = db.query(models.CapitalizationPeriod).filter(
        models.CapitalizationPeriod.period_type == "monthly"
    ).all()

    summaries_created = 0

    for period in periods[:11]:  # First 11 months
        # Get time entries for this period
        entries = db.query(models.TimeEntry).filter(
            models.TimeEntry.work_date >= period.start_date,
            models.TimeEntry.work_date <= period.end_date,
            models.TimeEntry.is_approved == True
        ).all()

        # Group by employee
        emp_entries = {}
        for entry in entries:
            if entry.employee_id not in emp_entries:
                emp_entries[entry.employee_id] = []
            emp_entries[entry.employee_id].append(entry)

        for emp_id, emp_entry_list in emp_entries.items():
            # Check if summary exists
            existing = db.query(models.EmployeeCapitalizationSummary).filter(
                models.EmployeeCapitalizationSummary.employee_id == emp_id,
                models.EmployeeCapitalizationSummary.period_id == period.id
            ).first()

            if existing:
                continue

            # Get employee's labor rate
            rate = db.query(models.EmployeeLaborRate).filter(
                models.EmployeeLaborRate.employee_id == emp_id,
                models.EmployeeLaborRate.effective_date <= period.end_date,
                (models.EmployeeLaborRate.end_date.is_(None) |
                 (models.EmployeeLaborRate.end_date >= period.start_date))
            ).first()

            if not rate:
                continue

            # Calculate totals
            total_hours = sum(e.hours for e in emp_entry_list)
            regular_hours = sum(e.hours for e in emp_entry_list if not e.is_overtime)
            overtime_hours = sum(e.hours for e in emp_entry_list if e.is_overtime)
            direct_hours = sum(e.hours for e in emp_entry_list if e.labor_type == "direct")
            indirect_hours = sum(e.hours for e in emp_entry_list if e.labor_type == "indirect")
            overhead_hours = sum(e.hours for e in emp_entry_list if e.labor_type == "overhead")
            capitalizable_hours = sum(e.hours for e in emp_entry_list if e.is_capitalizable)
            non_capitalizable_hours = total_hours - capitalizable_hours

            # Calculate costs
            fully_burdened_cost = sum(e.fully_burdened_cost or 0 for e in emp_entry_list)
            capitalizable_cost = sum(e.fully_burdened_cost or 0 for e in emp_entry_list if e.is_capitalizable)

            # Cost breakdown estimates
            base_labor_cost = total_hours * rate.hourly_rate
            overtime_premium = overtime_hours * rate.hourly_rate * 0.5
            benefits_cost = total_hours * rate.benefits_hourly
            taxes_cost = total_hours * rate.employer_taxes_hourly
            overhead_cost = total_hours * rate.overhead_rate_hourly

            cap_rate = (capitalizable_hours / total_hours * 100) if total_hours > 0 else 0

            summary = models.EmployeeCapitalizationSummary(
                employee_id=emp_id,
                period_id=period.id,
                total_hours=round(total_hours, 2),
                regular_hours=round(regular_hours, 2),
                overtime_hours=round(overtime_hours, 2),
                direct_hours=round(direct_hours, 2),
                indirect_hours=round(indirect_hours, 2),
                overhead_hours=round(overhead_hours, 2),
                capitalizable_hours=round(capitalizable_hours, 2),
                non_capitalizable_hours=round(non_capitalizable_hours, 2),
                base_labor_cost=round(base_labor_cost, 2),
                overtime_premium_cost=round(overtime_premium, 2),
                benefits_cost=round(benefits_cost, 2),
                employer_taxes_cost=round(taxes_cost, 2),
                overhead_cost=round(overhead_cost, 2),
                fully_burdened_cost=round(fully_burdened_cost, 2),
                capitalizable_cost=round(capitalizable_cost, 2),
                non_capitalizable_cost=round(fully_burdened_cost - capitalizable_cost, 2),
                labor_rate_id=rate.id,
                hourly_rate_used=rate.hourly_rate,
                fully_burdened_rate_used=rate.fully_burdened_rate,
                capitalization_rate=round(cap_rate, 2)
            )
            db.add(summary)
            summaries_created += 1

    db.commit()
    logger.info(f"Capitalization summaries created: {summaries_created}")


def update_period_totals(db):
    """Update capitalization period totals from summaries."""
    logger.info("--- Updating Period Totals ---")

    periods = db.query(models.CapitalizationPeriod).filter(
        models.CapitalizationPeriod.period_type == "monthly"
    ).all()

    for period in periods:
        summaries = db.query(models.EmployeeCapitalizationSummary).filter(
            models.EmployeeCapitalizationSummary.period_id == period.id
        ).all()

        if not summaries:
            continue

        period.total_hours = sum(s.total_hours for s in summaries)
        period.total_capitalizable_hours = sum(s.capitalizable_hours for s in summaries)
        period.total_labor_cost = sum(s.fully_burdened_cost for s in summaries)
        period.total_capitalized_cost = sum(s.capitalizable_cost for s in summaries)
        period.last_calculated_at = datetime.now()

        # Count unique employees and projects
        emp_ids = set(s.employee_id for s in summaries)
        period.employee_count = len(emp_ids)

        # Get project count from time entries
        entries = db.query(models.TimeEntry.project_id).filter(
            models.TimeEntry.work_date >= period.start_date,
            models.TimeEntry.work_date <= period.end_date
        ).distinct().all()
        period.project_count = len(entries)

        logger.info(f"Updated {period.period_id}: {period.total_hours:.0f} hrs, ${period.total_capitalized_cost:,.2f} cap cost")

    db.commit()


def create_sample_csv_files():
    """Create sample CSV files for upload demonstration."""
    logger.info("--- Creating Sample CSV Files ---")

    # Create static directory if it doesn't exist
    static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "sample_files")
    os.makedirs(static_dir, exist_ok=True)

    # Sample Time Data CSV
    time_data = [
        ["Employee ID", "Work Date", "Hours", "Project Code", "Labor Type", "Task Description", "Is Overtime"],
        ["EMP001", "2025-12-01", "8.0", "PROJ-2025-001", "direct", "Feature development", "N"],
        ["EMP001", "2025-12-02", "8.5", "PROJ-2025-001", "direct", "Code review", "N"],
        ["EMP001", "2025-12-03", "9.0", "PROJ-2025-002", "direct", "Bug fixes", "Y"],
        ["EMP002", "2025-12-01", "8.0", "PROJ-2025-003", "direct", "Data analysis", "N"],
        ["EMP002", "2025-12-02", "7.5", "PROJ-2025-100", "indirect", "Meetings", "N"],
        ["EMP003", "2025-12-01", "8.0", "PROJ-2025-002", "direct", "Mobile development", "N"],
        ["EMP003", "2025-12-02", "8.0", "PROJ-2025-002", "direct", "Testing", "N"],
        ["EMP004", "2025-12-01", "6.0", "PROJ-2025-101", "indirect", "Customer support", "N"],
        ["EMP004", "2025-12-02", "8.0", "PROJ-2025-101", "indirect", "Issue resolution", "N"],
        ["EMP005", "2025-12-01", "8.0", "PROJ-2025-004", "direct", "ERP enhancement", "N"],
        ["EMP005", "2025-12-02", "10.0", "PROJ-2025-004", "direct", "Integration work", "Y"],
    ]

    time_csv_path = os.path.join(static_dir, "sample_time_data.csv")
    with open(time_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(time_data)
    logger.info(f"Created: {time_csv_path}")

    # Sample Payroll Data CSV
    payroll_data = [
        ["Employee ID", "Pay Period Start", "Pay Period End", "Regular Hours", "Overtime Hours", "Gross Pay", "Benefits Deduction", "Tax Withholding"],
        ["EMP001", "2025-11-17", "2025-11-30", "80.0", "5.0", "4250.00", "350.00", "850.00"],
        ["EMP002", "2025-11-17", "2025-11-30", "80.0", "0.0", "3800.00", "320.00", "760.00"],
        ["EMP003", "2025-11-17", "2025-11-30", "76.0", "0.0", "3200.00", "280.00", "640.00"],
        ["EMP004", "2025-11-17", "2025-11-30", "80.0", "2.0", "2950.00", "250.00", "590.00"],
        ["EMP005", "2025-11-17", "2025-11-30", "80.0", "8.0", "5100.00", "420.00", "1020.00"],
        ["EMP001", "2025-12-01", "2025-12-14", "80.0", "3.0", "4150.00", "350.00", "830.00"],
        ["EMP002", "2025-12-01", "2025-12-14", "80.0", "0.0", "3800.00", "320.00", "760.00"],
        ["EMP003", "2025-12-01", "2025-12-14", "80.0", "0.0", "3368.00", "280.00", "673.60"],
        ["EMP004", "2025-12-01", "2025-12-14", "80.0", "0.0", "2880.00", "250.00", "576.00"],
        ["EMP005", "2025-12-01", "2025-12-14", "80.0", "10.0", "5250.00", "420.00", "1050.00"],
    ]

    payroll_csv_path = os.path.join(static_dir, "sample_payroll_data.csv")
    with open(payroll_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(payroll_data)
    logger.info(f"Created: {payroll_csv_path}")

    # Sample Labor Rates CSV
    rates_data = [
        ["Employee ID", "Effective Date", "Hourly Rate", "Benefits Rate", "Tax Rate", "Overhead Rate", "Notes"],
        ["EMP001", "2025-01-01", "50.00", "12.50", "5.33", "7.50", "Senior Developer rate"],
        ["EMP002", "2025-01-01", "45.00", "11.25", "4.79", "6.75", "Mid-level Developer rate"],
        ["EMP003", "2025-01-01", "40.00", "10.00", "4.26", "6.00", "Junior Developer rate"],
        ["EMP004", "2025-01-01", "35.00", "8.75", "3.73", "5.25", "Support Specialist rate"],
        ["EMP005", "2025-01-01", "60.00", "15.00", "6.39", "9.00", "Tech Lead rate"],
        ["EMP006", "2025-01-01", "55.00", "13.75", "5.86", "8.25", "Project Manager rate"],
        ["EMP007", "2025-01-01", "42.00", "10.50", "4.47", "6.30", "Business Analyst rate"],
        ["EMP008", "2025-01-01", "38.00", "9.50", "4.05", "5.70", "QA Engineer rate"],
    ]

    rates_csv_path = os.path.join(static_dir, "sample_labor_rates.csv")
    with open(rates_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rates_data)
    logger.info(f"Created: {rates_csv_path}")

    # Sample Project Assignments CSV
    project_data = [
        ["Project Code", "Project Name", "Is Capitalizable", "Department", "Start Date", "Budget", "Cap Type"],
        ["PROJ-2025-010", "AI Integration", "Y", "Engineering", "2025-06-01", "300000", "software_development"],
        ["PROJ-2025-011", "Security Enhancement", "Y", "IT", "2025-07-01", "200000", "software_development"],
        ["PROJ-2025-012", "Cloud Migration", "Y", "IT", "2025-08-01", "450000", "software_development"],
        ["PROJ-2025-110", "Helpdesk Support", "N", "Support", "2025-01-01", "100000", ""],
        ["PROJ-2025-111", "Compliance Training", "N", "HR", "2025-01-01", "50000", ""],
    ]

    project_csv_path = os.path.join(static_dir, "sample_projects.csv")
    with open(project_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(project_data)
    logger.info(f"Created: {project_csv_path}")

    logger.info(f"\n  Sample files created in: {static_dir}")
    return static_dir


def main():
    """Main function to create all demo data."""
    logger.info("=" * 60)
    logger.info("Creating Capitalized Labor Demo Data")
    logger.info("=" * 60)

    # Create session
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Get existing employees (handle case variations in status)
        employees = db.query(models.Employee).filter(
            models.Employee.status.ilike("active")
        ).limit(20).all()

        if not employees:
            logger.error("ERROR: No active employees found in database!")
            logger.info("Please ensure employee data exists before running this script.")
            return

        logger.info(f"\nFound {len(employees)} active employees")

        # Create projects
        projects = create_projects(db)

        # Create pay periods
        pay_periods = create_pay_periods(db)

        # Create labor rates
        labor_rates = create_labor_rates(db, employees)

        # Create timesheets and time entries
        create_timesheets_and_entries(db, employees, pay_periods, projects, labor_rates)

        # Create capitalization summaries
        create_capitalization_summaries(db)

        # Update period totals
        update_period_totals(db)

        # Create sample CSV files
        sample_dir = create_sample_csv_files()

        logger.info("=" * 60)
        logger.info("Demo data creation complete!")
        logger.info("=" * 60)
        logger.info(f"\nSample CSV files for upload demos are in:")
        logger.info(f"{sample_dir}")
        logger.info("You can now view the Capitalized Labor Management page")
        logger.info("to see the populated data.")

    except Exception as e:
        logger.error(f"\n ERROR: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
