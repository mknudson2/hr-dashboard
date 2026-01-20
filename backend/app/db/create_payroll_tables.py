#!/usr/bin/env python3
"""Create payroll tables and initialize payroll periods with tasks"""

from datetime import date, timedelta, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import Base, engine, SQLALCHEMY_DATABASE_URL
from db import models


def calculate_biweekly_periods(year: int):
    """
    Calculate 26 biweekly pay periods for a given year
    Monday-Sunday periods with payday on Friday following period end

    Based on confirmed schedule:
    - 2025 Period 26: 12/8/2025 - 12/21/2025, payday 12/26/2025
    - 2026 Period 1: 12/22/2025 - 1/4/2026, payday 1/9/2026
    """
    periods = []

    # Known anchor point: 2025 Period 26 ends on 12/21/2025
    # Working backwards: Period 1 of 2025 starts 25 periods before Period 26
    # Period 26 starts on 12/8/2025 (Monday)
    # Each period is 14 days, so Period 1 starts: 12/8/2025 - (25 * 14 days)

    if year == 2025:
        # Period 1 starts on 12/23/2024 (Monday)
        period_1_start = date(2024, 12, 23)
    elif year == 2026:
        # Period 1 starts on 12/22/2025 (Monday)
        period_1_start = date(2025, 12, 22)
    else:
        # For other years, calculate based on 2025/2026 pattern
        # Each year shifts by (26 * 14) % 7 = 364 % 7 = 0 days (since 364 is divisible by 7)
        # But we need to account for leap years
        years_diff = year - 2025
        period_1_start = date(2024, 12, 23) + timedelta(days=years_diff * 364)

        # Adjust for leap years between 2025 and target year
        for y in range(min(2025, year), max(2025, year)):
            if (y % 4 == 0 and y % 100 != 0) or (y % 400 == 0):
                period_1_start += timedelta(days=1 if years_diff > 0 else -1)

    current_monday = period_1_start

    for period_num in range(1, 27):  # 26 periods
        period_start = current_monday
        period_end = current_monday + timedelta(days=13)  # Sunday, 2 weeks later
        payday = period_end + timedelta(days=5)  # Friday after period end

        periods.append({
            'year': year,
            'period_number': period_num,
            'start_date': period_start,
            'end_date': period_end,
            'payday': payday,
            'status': 'completed' if payday < date.today() else 'upcoming',
            'employer_funding': True
        })

        current_monday += timedelta(days=14)  # Next period starts 2 weeks later

    return periods


def create_default_tasks():
    """
    Create the standard payroll task checklist
    Returns list of task dictionaries with parent-child relationships
    """
    tasks = []
    order = 1

    # Task 1: Send payroll email
    tasks.append({
        'title': 'Send payroll email',
        'description': 'Send the Payroll Email template to notify team',
        'task_type': 'main',
        'order_index': order,
        'has_email_button': True,
        'email_template_name': 'payroll_notification',
        'instructions': 'Click the button to send the payroll notification email to the team.'
    })
    order += 1

    # Task 2: Check Pending Employee Changes
    task_2_id = order
    tasks.append({
        'title': 'Check Pending Employee Changes',
        'description': 'Review and approve pending employee changes',
        'task_type': 'main',
        'order_index': order,
        'path_reference': 'HR & Payroll > Approvals > Pending Employee Changes',
        'instructions': 'Review all pending employee changes and approve or reject them before processing payroll.'
    })
    order += 1

    # Task 3: Gather payroll items
    tasks.append({
        'title': 'Gather payroll items from email & teams to payroll folder',
        'description': 'Collect all payroll-related items and organize',
        'task_type': 'main',
        'order_index': order,
        'instructions': 'Check email and Teams for any payroll adjustments, bonuses, or special items. Save all to the payroll folder.'
    })
    order += 1

    # Task 4: Ensure timecards approved (with subtasks)
    task_4_id = order
    tasks.append({
        'title': 'Ensure timecards have all been approved',
        'description': 'Verify all employee timecards are approved',
        'task_type': 'main',
        'order_index': order,
        'path_reference': 'Time & Labor > Employee Time > Time Card Approvals'
    })
    order += 1

    # Subtasks for Task 4
    tasks.append({
        'title': 'Review timecard approvals',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_4_id,
        'instructions': 'Take care of approvals if there are still some to be done. The important thing here is to check that everything looks accurate and balances are good.'
    })
    order += 1

    tasks.append({
        'title': 'Follow up with supervisors',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_4_id,
        'instructions': 'If one supervisor has many un-approved timecards, reach out to them to hop in and get them taken care of. Otherwise, we are able to approve them.'
    })
    order += 1

    # Task 5: Take care of remaining approvals (with subtasks)
    task_5_id = order
    tasks.append({
        'title': 'Take care of remaining approvals',
        'description': 'Process punch corrections, missing punches, and time off requests',
        'task_type': 'main',
        'order_index': order
    })
    order += 1

    # Subtasks for Task 5
    tasks.append({
        'title': 'Pending Punch Corrections',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_5_id,
        'path_reference': 'Time & Labor > Time Card Corrections > Pending Punch Corrections',
        'instructions': 'Click on From to sort and focus only on those within the relevant pay period.'
    })
    order += 1

    tasks.append({
        'title': 'Missing Punches',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_5_id,
        'path_reference': 'Time & Labor > Time Card Corrections > Missing Punches',
        'instructions': 'Click on From to sort and focus only on those within the relevant pay period. Reach out to employees with missing punches to get data.'
    })
    order += 1

    tasks.append({
        'title': 'Pending Time Off Requests',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_5_id,
        'path_reference': 'Time & Labor > Pending Time Off requests',
        'instructions': 'Click Request Start to view requests that took place in the relevant pay period. If their balance is sufficient for the requested hours, approve them. Otherwise, reach out to supervisor for approval-approve if they are fine, deny if not.'
    })
    order += 1

    # Task 6: Input FMLA hours
    tasks.append({
        'title': 'Input FMLA hours',
        'description': 'Enter FMLA hours from calendar',
        'task_type': 'main',
        'order_index': order,
        'instructions': 'Take the hours from the calendar. Use whatever accrued time you are able and mark the rest as FMLA unpaid.'
    })
    order += 1

    # Task 7: Review Payroll Notes
    tasks.append({
        'title': 'Review Payroll Notes (pre-process items)',
        'description': 'Review notes for any special adjustments needed',
        'task_type': 'main',
        'order_index': order,
        'instructions': 'Check the payroll notes section for any special items that need attention before processing.'
    })
    order += 1

    # Task 8: Process Payroll (with many subtasks)
    task_8_id = order
    tasks.append({
        'title': 'Process Payroll',
        'description': 'Execute payroll processing in Paylocity',
        'task_type': 'main',
        'order_index': order,
        'path_reference': 'HR & Payroll > Payroll > Run Payroll'
    })
    order += 1

    # Subtasks for Task 8
    subtask_8_items = [
        ('Start Payroll', 'Click the Start Payroll button for the relevant pay period.'),
        ('Create Batch (Regular)', 'Create a new regular payroll batch.'),
        ('Funding Insurance?', 'Toggle employer portion of medical funding based on period settings.', True, 'Fund employer medical?'),
        ('Add Time Data for Hourly Employees', 'Import or verify time data for all hourly employees.'),
        ('Add Bonuses', 'Add any bonuses from the payroll items gathered.'),
        ('Add Gift Card amounts and gross-up bonuses', 'Process gift cards and calculate gross-up amounts.'),
        ('Make manual changes to contributions', 'Adjust retirement and benefit contributions as needed.'),
        ('Make any other adjustments from Payroll Notes', 'Apply all adjustments noted in the pre-process review.'),
        ('Save and Continue to Approvals', 'Save the payroll and move to approval stage.'),
        ('Review warnings and resolve as needed', 'Address any warnings or errors flagged by the system.'),
        ('Approve the payroll', 'Final approval of the payroll batch.'),
        ('Download the pre-processed payroll register', 'Download and save the register before submission.'),
        ('Submit Payroll', 'Submit the final payroll for processing.'),
    ]

    for title, instructions, *extra in subtask_8_items:
        task_data = {
            'title': title,
            'task_type': 'sub',
            'order_index': order,
            'parent_ref': task_8_id,
            'instructions': instructions
        }
        if extra:
            task_data['has_toggle'] = True
            task_data['toggle_label'] = extra[0]
        tasks.append(task_data)
        order += 1

    # Task 9: Download Payroll Reports (with subtasks)
    task_9_id = order
    tasks.append({
        'title': 'Download Payroll Reports',
        'description': 'Download all required payroll reports',
        'task_type': 'main',
        'order_index': order,
        'path_reference': 'HR & Payroll > Reports & Analytics > Payroll Process'
    })
    order += 1

    # Subtasks for Task 9
    subtask_9_items = [
        ('Payroll Process Reports', 'Download all reports except Invoice Co., Employee Setup – Invalid SSN, and any other report that has no data. Save all to payroll folder.', 'HR & Payroll > Reports & Analytics > Payroll Process'),
        ('Bulk Run Payroll Reports', 'Mark all and click Bulk Run.', 'HR & Payroll > Reports & Analytics > Reporting > Tag > Payroll Reports'),
        ('Download and Extract Reports', 'On Report Pickup, mark the reports and download zip. Move zip to payroll folder and extract all. Once extracted, delete zip folder.'),
        ('Verify Required Reports', 'Ensure these reports are present: 401(k) report, Check Stub, Deduction Listing, Earnings Listing, Payroll Register with ER Taxes'),
    ]

    for title, instructions, *path in subtask_9_items:
        task_data = {
            'title': title,
            'task_type': 'sub',
            'order_index': order,
            'parent_ref': task_9_id,
            'instructions': instructions
        }
        if path:
            task_data['path_reference'] = path[0]
        tasks.append(task_data)
        order += 1

    # Task 10: Send Funds Transfer Request (with subtasks)
    task_10_id = order
    tasks.append({
        'title': 'Send Funds Transfer Request',
        'description': 'Prepare and send funds transfer email',
        'task_type': 'main',
        'order_index': order
    })
    order += 1

    # Subtasks for Task 10
    tasks.append({
        'title': 'Prepare Funds Transfer',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_10_id,
        'instructions': 'Using the Payroll Summary, Deduction Listing, Earnings Listing, HSA Report, and 401(k) report, fill out the payroll worksheet.'
    })
    order += 1

    tasks.append({
        'title': 'Send Funds Transfer Request Email',
        'task_type': 'sub',
        'order_index': order,
        'parent_ref': task_10_id,
        'has_email_button': True,
        'email_template_name': 'funds_transfer_request',
        'instructions': 'Email Shelli, with Natalie cc\'ed. Copy the itemized data table into email and send.'
    })
    order += 1

    # Task 11: Reconcile and Upload Contributions
    task_11_id = order
    tasks.append({
        'title': 'Reconcile and Upload Contributions',
        'description': 'Reconcile benefit contributions and upload to providers',
        'task_type': 'main',
        'order_index': order,
        'instructions': 'Verify all contribution amounts match reports and upload to benefit providers.'
    })
    order += 1

    # Subtasks for Task 11
    subtask_11_items = [
        ('DCAP', 'Reconcile DCAP contribution amounts and upload to provider.'),
        ('FSA', 'Reconcile FSA contribution amounts and upload to provider.'),
        ('LFSA', 'Reconcile LFSA contribution amounts and upload to provider.'),
        ('HSA', 'Reconcile HSA contribution amounts and upload to provider.'),
        ('HRA*', 'Reconcile HRA contribution amounts and upload to provider. Only applicable for the first payroll of each month.'),
    ]

    for title, instructions in subtask_11_items:
        tasks.append({
            'title': title,
            'task_type': 'sub',
            'order_index': order,
            'parent_ref': task_11_id,
            'instructions': instructions
        })
        order += 1

    # Task 12: Send Contribution Files
    tasks.append({
        'title': 'Send Contribution Files',
        'description': 'Send contribution files to internal contribution processor',
        'task_type': 'main',
        'order_index': order,
        'instructions': 'Send the contribution files to internal contribution processor for confirmation and approval.'
    })
    order += 1

    # Task 13: Prepare and Send Garnishment Calculations
    task_13_id = order
    tasks.append({
        'title': 'Prepare and Send Garnishment Calculations',
        'description': 'Calculate and send garnishment amounts',
        'task_type': 'main',
        'order_index': order,
        'instructions': 'Calculate all garnishment amounts and send to appropriate parties.'
    })
    order += 1

    # Subtasks for Task 13
    subtask_13_items = [
        ('Create garnishment folders in the payroll file', 'Create necessary folder structure for garnishment documents in the payroll file.'),
        ('Complete Garnishment form with paycheck data', 'Fill out the garnishment calculation form using the employee paycheck data.'),
        ('Print to PDF', 'Print the completed garnishment form to PDF format.'),
        ('Send secure copy to Garnishment Agency', 'Send a secure copy of the garnishment documents to the appropriate Garnishment Agency.'),
        ("Send secure copy to Employee's personal email", "Send a secure copy of the garnishment documents to the employee's personal email address."),
        ('Save documents to general garnishment folder', 'Save all garnishment documents to the general garnishment folder for record keeping.'),
    ]

    for title, instructions in subtask_13_items:
        tasks.append({
            'title': title,
            'task_type': 'sub',
            'order_index': order,
            'parent_ref': task_13_id,
            'instructions': instructions
        })
        order += 1

    return tasks


def create_payroll_tables():
    """Create payroll tables in the database"""
    print("Creating payroll tables...")

    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✅ Payroll tables created successfully!")

    # Create session
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Check if we already have payroll periods
        existing = db.query(models.PayrollPeriod).first()
        if existing:
            print("⚠️  Payroll periods already exist. Skipping initialization.")
            return

        # Initialize payroll periods for current and next year
        current_year = datetime.now().year
        years = [current_year, current_year + 1]

        print(f"Initializing payroll periods for {years}...")

        for year in years:
            # Calculate periods
            periods = calculate_biweekly_periods(year)

            # Create default task templates
            task_templates = create_default_tasks()

            for period_data in periods:
                # Create payroll period
                period = models.PayrollPeriod(**period_data)
                db.add(period)
                db.flush()  # Get the ID

                # Create tasks for this period
                parent_task_map = {}  # Maps order_index to task object for parent references

                for task_template in task_templates:
                    task_data = task_template.copy()
                    task_data['payroll_period_id'] = period.id

                    # Handle parent reference
                    parent_ref = task_data.pop('parent_ref', None)
                    if parent_ref and parent_ref in parent_task_map:
                        task_data['parent_task_id'] = parent_task_map[parent_ref].id

                    task = models.PayrollTask(**task_data)
                    db.add(task)
                    db.flush()  # Get the ID

                    # Store main tasks for parent references
                    if task.task_type == 'main':
                        parent_task_map[task.order_index] = task

            print(f"✅ Created {len(periods)} payroll periods for {year}")

        db.commit()
        print("✅ Payroll initialization complete!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_payroll_tables()
