"""
FMLA Notice Management Utility
Command-line tool for viewing and managing FMLA notices
"""

import sys
import os
from datetime import datetime, date
from typing import Optional
from tabulate import tabulate
from app.db.database import SessionLocal
from app.db.models import FMLALeaveRequest, Employee


class FMLAManager:
    """Manager for FMLA notices"""

    def __init__(self):
        self.db = SessionLocal()

    def close(self):
        """Close database session"""
        self.db.close()

    def list_notices(
        self,
        status: Optional[str] = None,
        employee_id: Optional[int] = None,
        limit: int = 20
    ):
        """List FMLA notices with optional filtering"""
        print("=" * 100)
        print("FMLA NOTICES")
        print("=" * 100)

        query = self.db.query(FMLALeaveRequest)

        if status:
            query = query.filter(FMLALeaveRequest.status == status)
        if employee_id:
            query = query.filter(FMLALeaveRequest.employee_id == employee_id)

        notices = query.order_by(FMLALeaveRequest.created_at.desc()).limit(limit).all()

        if not notices:
            print("\nNo notices found.")
            return

        # Prepare table data
        table_data = []
        for notice in notices:
            employee = self.db.query(Employee).filter(Employee.id == notice.employee_id).first()
            employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

            table_data.append([
                notice.id,
                employee_name,
                notice.leave_reason.replace('_', ' ').title(),
                notice.request_date.strftime("%Y-%m-%d"),
                notice.leave_start_date.strftime("%Y-%m-%d"),
                "✓" if notice.is_eligible else "✗",
                notice.status,
                "✓" if notice.filled_form_path else "✗",
                "✓" if notice.notice_sent_date else "✗"
            ])

        headers = ["ID", "Employee", "Reason", "Request Date", "Leave Start", "Eligible", "Status", "Form", "Sent"]
        print(f"\n{tabulate(table_data, headers=headers, tablefmt='grid')}")
        print(f"\nShowing {len(notices)} notice(s)")

    def view_notice(self, notice_id: int):
        """View detailed information about a specific notice"""
        notice = self.db.query(FMLALeaveRequest).filter(FMLALeaveRequest.id == notice_id).first()

        if not notice:
            print(f"✗ Notice ID {notice_id} not found")
            return

        employee = self.db.query(Employee).filter(Employee.id == notice.employee_id).first()

        print("=" * 100)
        print(f"FMLA NOTICE DETAILS - ID: {notice.id}")
        print("=" * 100)

        print(f"\n{'EMPLOYEE INFORMATION':─<50}")
        print(f"  Name: {employee.first_name} {employee.last_name}" if employee else "  Name: Unknown")
        print(f"  Employee ID: {employee.employee_id if employee else 'N/A'}")
        if employee and hasattr(employee, 'email'):
            print(f"  Email: {employee.email or 'Not set'}")
        if employee and employee.hire_date:
            print(f"  Hire Date: {employee.hire_date.strftime('%Y-%m-%d')}")

        print(f"\n{'LEAVE INFORMATION':─<50}")
        print(f"  Request Date: {notice.request_date.strftime('%Y-%m-%d')}")
        print(f"  Leave Start: {notice.leave_start_date.strftime('%Y-%m-%d')}")
        if notice.leave_end_date:
            print(f"  Leave End: {notice.leave_end_date.strftime('%Y-%m-%d')}")
        print(f"  Reason: {notice.leave_reason.replace('_', ' ').title()}")
        if notice.family_relationship:
            print(f"  Family Relationship: {notice.family_relationship.replace('_', ' ').title()}")

        print(f"\n{'ELIGIBILITY':─<50}")
        print(f"  Eligible: {'Yes ✓' if notice.is_eligible else 'No ✗'}")
        if notice.months_employed:
            print(f"  Months Employed: {notice.months_employed:.1f}")
        if notice.hours_worked_12months:
            print(f"  Hours Worked (12mo): {notice.hours_worked_12months:,}")
        if notice.ineligibility_reasons:
            print(f"  Ineligibility Reasons:")
            for reason in notice.ineligibility_reasons:
                print(f"    - {reason}")

        print(f"\n{'CERTIFICATION':─<50}")
        print(f"  Certification Required: {'Yes' if notice.certification_required else 'No'}")
        if notice.certification_type:
            print(f"  Certification Type: {notice.certification_type.replace('_', ' ').title()}")
        if notice.certification_due_date:
            print(f"  Certification Due: {notice.certification_due_date.strftime('%Y-%m-%d')}")
        print(f"  Certification Attached: {'Yes' if notice.certification_attached else 'No'}")

        print(f"\n{'FORM & DELIVERY':─<50}")
        print(f"  Status: {notice.status}")
        print(f"  Form Generated: {'Yes ✓' if notice.filled_form_path else 'No ✗'}")
        if notice.filled_form_path:
            print(f"  Form Path: {notice.filled_form_path}")
            print(f"  File Exists: {'Yes ✓' if os.path.exists(notice.filled_form_path) else 'No ✗'}")
        if notice.notice_sent_date:
            print(f"  Sent Date: {notice.notice_sent_date.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  Sent Method: {notice.notice_sent_method or 'Unknown'}")

        print(f"\n{'METADATA':─<50}")
        print(f"  Created: {notice.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Created By: {notice.created_by}")
        if notice.internal_notes:
            print(f"  Notes: {notice.internal_notes}")

        print()

    def summary_stats(self):
        """Display summary statistics"""
        print("=" * 100)
        print("FMLA NOTICES - SUMMARY STATISTICS")
        print("=" * 100)

        # Total notices
        total = self.db.query(FMLALeaveRequest).count()

        # By status
        statuses = self.db.query(
            FMLALeaveRequest.status,
            func.count(FMLALeaveRequest.id)
        ).group_by(FMLALeaveRequest.status).all()

        # By eligibility
        eligible = self.db.query(FMLALeaveRequest).filter(FMLALeaveRequest.is_eligible == True).count()
        ineligible = self.db.query(FMLALeaveRequest).filter(FMLALeaveRequest.is_eligible == False).count()

        # By leave reason
        reasons = self.db.query(
            FMLALeaveRequest.leave_reason,
            func.count(FMLALeaveRequest.id)
        ).group_by(FMLALeaveRequest.leave_reason).all()

        # Forms generated and sent
        forms_generated = self.db.query(FMLALeaveRequest).filter(
            FMLALeaveRequest.filled_form_path.isnot(None)
        ).count()
        forms_sent = self.db.query(FMLALeaveRequest).filter(
            FMLALeaveRequest.notice_sent_date.isnot(None)
        ).count()

        print(f"\n{'OVERALL':─<50}")
        print(f"  Total Notices: {total}")
        print(f"  Forms Generated: {forms_generated}")
        print(f"  Forms Sent: {forms_sent}")

        print(f"\n{'ELIGIBILITY':─<50}")
        print(f"  Eligible: {eligible}")
        print(f"  Ineligible: {ineligible}")

        if statuses:
            print(f"\n{'BY STATUS':─<50}")
            for status, count in statuses:
                print(f"  {status.replace('_', ' ').title()}: {count}")

        if reasons:
            print(f"\n{'BY LEAVE REASON':─<50}")
            for reason, count in reasons:
                print(f"  {reason.replace('_', ' ').title()}: {count}")

        print()

    def pending_certifications(self):
        """List notices with pending certifications"""
        from sqlalchemy import func as sql_func

        print("=" * 100)
        print("PENDING CERTIFICATIONS")
        print("=" * 100)

        today = date.today()

        notices = self.db.query(FMLALeaveRequest).filter(
            FMLALeaveRequest.certification_required == True,
            FMLALeaveRequest.certification_attached == False,
            FMLALeaveRequest.certification_due_date.isnot(None)
        ).order_by(FMLALeaveRequest.certification_due_date).all()

        if not notices:
            print("\nNo pending certifications.")
            return

        table_data = []
        for notice in notices:
            employee = self.db.query(Employee).filter(Employee.id == notice.employee_id).first()
            employee_name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"

            days_remaining = (notice.certification_due_date - today).days
            urgency = "🔴 OVERDUE" if days_remaining < 0 else "🟡 URGENT" if days_remaining <= 7 else "🟢"

            table_data.append([
                notice.id,
                employee_name,
                notice.certification_due_date.strftime("%Y-%m-%d"),
                f"{days_remaining} days",
                urgency
            ])

        headers = ["ID", "Employee", "Due Date", "Days Remaining", "Status"]
        print(f"\n{tabulate(table_data, headers=headers, tablefmt='grid')}")
        print(f"\nShowing {len(notices)} pending certification(s)")

    def open_form(self, notice_id: int):
        """Open the PDF form for a notice"""
        notice = self.db.query(FMLALeaveRequest).filter(FMLALeaveRequest.id == notice_id).first()

        if not notice:
            print(f"✗ Notice ID {notice_id} not found")
            return

        if not notice.filled_form_path:
            print(f"✗ No form has been generated for notice ID {notice_id}")
            return

        if not os.path.exists(notice.filled_form_path):
            print(f"✗ Form file not found: {notice.filled_form_path}")
            return

        print(f"Opening: {notice.filled_form_path}")
        os.system(f'open "{notice.filled_form_path}"')


def main():
    """Main CLI interface"""
    import argparse
    from sqlalchemy import func

    parser = argparse.ArgumentParser(description="FMLA Notice Management Utility")
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # List command
    list_parser = subparsers.add_parser('list', help='List FMLA notices')
    list_parser.add_argument('--status', help='Filter by status')
    list_parser.add_argument('--employee-id', type=int, help='Filter by employee ID')
    list_parser.add_argument('--limit', type=int, default=20, help='Max number of results')

    # View command
    view_parser = subparsers.add_parser('view', help='View notice details')
    view_parser.add_argument('notice_id', type=int, help='Notice ID')

    # Stats command
    subparsers.add_parser('stats', help='Show summary statistics')

    # Pending certifications
    subparsers.add_parser('pending', help='Show pending certifications')

    # Open form command
    open_parser = subparsers.add_parser('open', help='Open PDF form')
    open_parser.add_argument('notice_id', type=int, help='Notice ID')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    manager = FMLAManager()

    try:
        if args.command == 'list':
            manager.list_notices(
                status=args.status,
                employee_id=args.employee_id,
                limit=args.limit
            )
        elif args.command == 'view':
            manager.view_notice(args.notice_id)
        elif args.command == 'stats':
            manager.summary_stats()
        elif args.command == 'pending':
            manager.pending_certifications()
        elif args.command == 'open':
            manager.open_form(args.notice_id)
    finally:
        manager.close()


if __name__ == "__main__":
    main()
