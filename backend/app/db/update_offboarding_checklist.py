"""
Update Offboarding Checklist with Comprehensive Process
This script updates the default offboarding template with the complete offboarding process
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db import models

def update_offboarding_checklist():
    """Update offboarding checklist with comprehensive process"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("\n📋 Updating Offboarding Checklist...")
        print("=" * 60)

        # Define the comprehensive offboarding checklist
        offboarding_tasks = [
            # Initial Setup
            {
                "task_name": "Schedule Exit Interview",
                "task_description": "Schedule exit interview with departing employee",
                "category": "Initial Setup",
                "assigned_to_role": "HR",
                "days_from_termination": -7,  # 7 days before termination
                "priority": "High",
                "order": 1
            },

            # Exit Survey (Voluntary Only)
            {
                "task_name": "Send Exit Survey (If Voluntary)",
                "task_description": "For voluntary terminations, send exit survey to employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -7,
                "priority": "Medium",
                "order": 2,
                "conditional": "voluntary"
            },

            # Exit Documents - Full Time
            {
                "task_name": "Send Equitable Portability Form (Full Time)",
                "task_description": "Send Equitable Portability form to full-time employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 3,
                "conditional": "full_time"
            },
            {
                "task_name": "Send Equitable Conversion Form (Full Time)",
                "task_description": "Send Equitable Conversion form to full-time employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 4,
                "conditional": "full_time"
            },
            {
                "task_name": "Send Important Information for Terminating Employee (Full Time)",
                "task_description": "Send important termination information document to full-time employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 5,
                "conditional": "full_time"
            },
            {
                "task_name": "Send Non-Solicitation and Confidentiality Document (Full Time)",
                "task_description": "Send Non-Solicitation and Confidentiality agreement to full-time employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 6,
                "conditional": "full_time"
            },

            # Exit Documents - Part Time
            {
                "task_name": "Send Important Information (Part Time)",
                "task_description": "Send important information document to part-time employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 7,
                "conditional": "part_time"
            },
            {
                "task_name": "Send Non-Solicitation Document (Part Time)",
                "task_description": "Send Non-Solicitation agreement to part-time employee",
                "category": "Documentation",
                "assigned_to_role": "HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 8,
                "conditional": "part_time"
            },

            # Equipment Return
            {
                "task_name": "Check for Equipment to Return",
                "task_description": "Determine if employee has any company equipment to return",
                "category": "Equipment",
                "assigned_to_role": "IT/HR",
                "days_from_termination": -5,
                "priority": "High",
                "order": 9
            },
            {
                "task_name": "Send Equipment Return Label (If Applicable)",
                "task_description": "If employee has equipment to return, send return shipping label",
                "category": "Equipment",
                "assigned_to_role": "IT",
                "days_from_termination": -3,
                "priority": "Medium",
                "order": 10,
                "conditional": "has_equipment"
            },

            # Communication
            {
                "task_name": "Send Exit Document Email to Employee",
                "task_description": "Email all completed exit documents to employee",
                "category": "Communication",
                "assigned_to_role": "HR",
                "days_from_termination": -3,
                "priority": "High",
                "order": 11
            },

            # Exit Interview
            {
                "task_name": "Conduct Exit Interview",
                "task_description": "Hold scheduled exit interview with employee",
                "category": "Interview",
                "assigned_to_role": "HR Manager",
                "days_from_termination": -2,
                "priority": "High",
                "order": 12
            },

            # System Processing
            {
                "task_name": "Submit Termination Ticket via Zoho Service Desk",
                "task_description": "Create termination ticket in Zoho Service Desk",
                "category": "Systems",
                "assigned_to_role": "HR",
                "days_from_termination": 0,
                "priority": "Critical",
                "order": 13
            },
            {
                "task_name": "Send NBS Term Emails",
                "task_description": "Send termination notification emails to NBS",
                "category": "Systems",
                "assigned_to_role": "HR",
                "days_from_termination": 0,
                "priority": "Critical",
                "order": 14
            },

            # PTO & Payroll
            {
                "task_name": "Calculate Final PTO and Shut Off PTO Accrual",
                "task_description": "Calculate final PTO payout and disable PTO accrual in payroll system",
                "category": "Payroll",
                "assigned_to_role": "Payroll",
                "days_from_termination": 0,
                "priority": "Critical",
                "order": 15
            },
            {
                "task_name": "Process Final Paycheck",
                "task_description": "Process employee's final paycheck including PTO payout",
                "category": "Payroll",
                "assigned_to_role": "Payroll",
                "days_from_termination": 0,
                "priority": "Critical",
                "order": 16
            },
            {
                "task_name": "Download Reports",
                "task_description": "Download all necessary payroll and employee reports",
                "category": "Payroll",
                "assigned_to_role": "Payroll",
                "days_from_termination": 0,
                "priority": "High",
                "order": 17
            },
            {
                "task_name": "Send Funds Transfer Email to Shelli",
                "task_description": "Send funds transfer notification email to Shelli for final paycheck",
                "category": "Payroll",
                "assigned_to_role": "Payroll",
                "days_from_termination": 0,
                "priority": "High",
                "order": 18
            },

            # Benefits & Contributions
            {
                "task_name": "Process Final Contribution Upload (If Applicable)",
                "task_description": "Upload final HSA/FSA/401k contributions if employee has benefits",
                "category": "Benefits",
                "assigned_to_role": "Payroll/HR",
                "days_from_termination": 1,
                "priority": "High",
                "order": 19,
                "conditional": "has_benefits"
            },

            # Legal & Compliance
            {
                "task_name": "Notify Garnishment Agency (If Applicable)",
                "task_description": "If employee has active garnishments, notify garnishment agency of termination",
                "category": "Compliance",
                "assigned_to_role": "Payroll",
                "days_from_termination": 1,
                "priority": "High",
                "order": 20,
                "conditional": "has_garnishment"
            },
            {
                "task_name": "Send COBRA Notice (If Applicable)",
                "task_description": "Send COBRA continuation notice to eligible employees",
                "category": "Benefits",
                "assigned_to_role": "HR",
                "days_from_termination": 2,
                "priority": "Critical",
                "order": 21,
                "conditional": "cobra_eligible"
            },

            # System Termination
            {
                "task_name": "Terminate in Paylocity",
                "task_description": "Process termination in Paylocity system",
                "category": "Systems",
                "assigned_to_role": "Payroll",
                "days_from_termination": 1,
                "priority": "Critical",
                "order": 22
            },

            # Final Documentation
            {
                "task_name": "Complete Term Checklist (Including I-9 Completion Date)",
                "task_description": "Complete termination checklist and record I-9 completion date",
                "category": "Compliance",
                "assigned_to_role": "HR",
                "days_from_termination": 2,
                "priority": "High",
                "order": 23
            },
            {
                "task_name": "Download and Save All Documents to Employee Folder",
                "task_description": "Download all employee documents and save to employee folder",
                "category": "Records",
                "assigned_to_role": "HR",
                "days_from_termination": 3,
                "priority": "High",
                "order": 24
            },
            {
                "task_name": "Move Folder to Old Employees Folder",
                "task_description": "Archive employee folder to old employees directory",
                "category": "Records",
                "assigned_to_role": "HR",
                "days_from_termination": 3,
                "priority": "Medium",
                "order": 25
            }
        ]

        # Check if default template exists
        default_template = db.query(models.OffboardingTemplate).filter(
            models.OffboardingTemplate.is_default == True
        ).first()

        if not default_template:
            # Create default template
            print("Creating new default offboarding template...")
            default_template = models.OffboardingTemplate(
                template_id="OFF-TEMPLATE-001",
                name="Standard Offboarding Process",
                description="Comprehensive offboarding checklist for all employee terminations",
                is_default=True,
                is_active=True,
                duration_days=30,
                auto_assign=True,
                require_exit_interview=True,
                created_by="System",
                created_at=datetime.now()
            )
            db.add(default_template)
            db.commit()
            db.refresh(default_template)
            print(f"✓ Created default template: {default_template.template_id}")
        else:
            print(f"✓ Found existing default template: {default_template.template_id}")

        # Delete existing template items for this template
        db.query(models.OffboardingTemplateItem).filter(
            models.OffboardingTemplateItem.template_id == default_template.id
        ).delete()
        db.commit()
        print("✓ Cleared existing template items")

        # Add new template items
        items_added = 0
        for task in offboarding_tasks:
            template_item = models.OffboardingTemplateItem(
                template_id=default_template.id,
                task_name=task["task_name"],
                task_description=task["task_description"],
                category=task["category"],
                assigned_to_role=task.get("assigned_to_role"),
                days_from_termination=task["days_from_termination"],
                priority=task["priority"],
                order=task["order"],
                is_required=True,
                is_conditional=task.get("conditional") is not None,
                condition_field=task.get("conditional")
            )
            db.add(template_item)
            items_added += 1

        db.commit()
        print(f"✓ Added {items_added} checklist items to template")

        # Display summary
        print("\n" + "=" * 60)
        print("✅ Offboarding Checklist Updated Successfully!")
        print("=" * 60)
        print(f"  Template: {default_template.name}")
        print(f"  Template ID: {default_template.template_id}")
        print(f"  Total Tasks: {items_added}")
        print("=" * 60)

        # Display tasks by category
        print("\n📊 Tasks by Category:")
        from collections import defaultdict
        categories = defaultdict(int)
        for task in offboarding_tasks:
            categories[task["category"]] += 1

        for category, count in sorted(categories.items()):
            print(f"  • {category}: {count} tasks")

        print("\n✓ Offboarding checklist is ready to use!")
        print("  New offboarding processes will automatically use this checklist.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error updating offboarding checklist: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    update_offboarding_checklist()
