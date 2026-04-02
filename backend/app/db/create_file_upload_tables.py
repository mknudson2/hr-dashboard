"""
Create file upload and processing tables
Run this script to initialize the file upload management system
"""

from app.db.database import engine
from app.db.models import Base, FileUpload, FileProcessingLog, DataImportHistory, FileValidationRule, SFTPConfiguration
import logging

logger = logging.getLogger(__name__)

def create_file_upload_tables():
    """Create all file upload related tables"""
    logger.info("Creating file upload management tables...")

    # Create only the file upload related tables
    tables_to_create = [
        FileUpload.__table__,
        FileProcessingLog.__table__,
        DataImportHistory.__table__,
        FileValidationRule.__table__,
        SFTPConfiguration.__table__,
    ]

    for table in tables_to_create:
        logger.info(f"Creating table: {table.name}")
        table.create(bind=engine, checkfirst=True)

    logger.info("File upload tables created successfully!")

if __name__ == "__main__":
    create_file_upload_tables()
