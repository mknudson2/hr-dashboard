"""
Create FMLA Notice of Eligibility (WH-381) tables
Run this script to add FMLA leave request and PDF form tracking tables
"""

from app.db.database import engine
from app.db.models import Base, FMLALeaveRequest, FilledPdfForm

def create_fmla_notice_tables():
    """Create FMLA WH-381 notice and PDF form tracking tables"""
    print("Creating FMLA Notice of Eligibility tables...")

    # Create the FMLA notice related tables
    tables_to_create = [
        FMLALeaveRequest.__table__,
        FilledPdfForm.__table__,
    ]

    for table in tables_to_create:
        print(f"  Creating table: {table.name}")
        table.create(bind=engine, checkfirst=True)

    print("✓ FMLA notice tables created successfully!")
    print("\nTables created:")
    print("  - fmla_leave_requests: Tracks FMLA leave requests and eligibility")
    print("  - filled_pdf_forms: Generic table for all filled PDF forms")
    print("\nYou can now:")
    print("  1. Use POST /fmla/create-notice to generate WH-381 forms")
    print("  2. Use POST /fmla/check-eligibility to check employee eligibility")
    print("  3. Use GET /fmla/notices to list all notices")

if __name__ == "__main__":
    create_fmla_notice_tables()
