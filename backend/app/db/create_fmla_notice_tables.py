"""
Create FMLA Notice of Eligibility (WH-381) tables
Run this script to add FMLA leave request and PDF form tracking tables
"""

from app.db.database import engine
from app.db.models import Base, FMLALeaveRequest, FilledPdfForm
import logging

logger = logging.getLogger(__name__)

def create_fmla_notice_tables():
    """Create FMLA WH-381 notice and PDF form tracking tables"""
    logger.info("Creating FMLA Notice of Eligibility tables...")

    # Create the FMLA notice related tables
    tables_to_create = [
        FMLALeaveRequest.__table__,
        FilledPdfForm.__table__,
    ]

    for table in tables_to_create:
        logger.info(f"Creating table: {table.name}")
        table.create(bind=engine, checkfirst=True)

    logger.info("FMLA notice tables created successfully!")
    logger.info("Tables created:")
    logger.info("- fmla_leave_requests: Tracks FMLA leave requests and eligibility")
    logger.info("- filled_pdf_forms: Generic table for all filled PDF forms")
    logger.info("You can now:")
    logger.info("1. Use POST /fmla/create-notice to generate WH-381 forms")
    logger.info("2. Use POST /fmla/check-eligibility to check employee eligibility")
    logger.info("3. Use GET /fmla/notices to list all notices")

if __name__ == "__main__":
    create_fmla_notice_tables()
