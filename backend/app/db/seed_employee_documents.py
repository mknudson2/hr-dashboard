#!/usr/bin/env python3
"""
Seed sample employee documents.

Usage:
    python -m app.db.seed_employee_documents
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import date
from app.db.database import SessionLocal
from app.db import models
import logging

logger = logging.getLogger(__name__)


SAMPLE_DOCS = [
    # Employee id=4 (auto-assigned at seed time)
    {"employee_id": 4, "name": "Pay Stub - January 2026", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2026, 1, 31), "file_size": "128 KB", "download_url": "/api/portal/my-hr/documents/1/download"},
    {"employee_id": 4, "name": "Pay Stub - December 2025", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2025, 12, 31), "file_size": "124 KB", "download_url": "/api/portal/my-hr/documents/2/download"},
    {"employee_id": 4, "name": "W-2 Tax Form - 2024", "document_type": "w2", "category": "Tax Forms", "document_date": date(2025, 1, 30), "file_size": "89 KB", "download_url": "/api/portal/my-hr/documents/3/download"},
    {"employee_id": 4, "name": "Benefits Enrollment Confirmation", "document_type": "benefits_summary", "category": "Benefits", "document_date": date(2025, 11, 15), "file_size": "215 KB", "download_url": "/api/portal/my-hr/documents/4/download"},
    # Employee id=12 - used by test_employee user
    {"employee_id": 12, "name": "Pay Stub - January 2026", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2026, 1, 31), "file_size": "126 KB", "download_url": "/api/portal/my-hr/documents/5/download"},
    {"employee_id": 12, "name": "Pay Stub - December 2025", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2025, 12, 30), "file_size": "124 KB", "download_url": "/api/portal/my-hr/documents/6/download"},
    {"employee_id": 12, "name": "W-2 Tax Form - 2024", "document_type": "w2", "category": "Tax Forms", "document_date": date(2025, 1, 30), "file_size": "89 KB", "download_url": "/api/portal/my-hr/documents/7/download"},
    {"employee_id": 12, "name": "Offer Letter", "document_type": "offer_letter", "category": "Offer Letters", "document_date": date(2023, 3, 15), "file_size": "156 KB", "download_url": "/api/portal/my-hr/documents/8/download"},
    # Employee id=13 - used by test_clean_employee user
    {"employee_id": 13, "name": "Pay Stub - January 2026", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2026, 1, 31), "file_size": "130 KB", "download_url": "/api/portal/my-hr/documents/9/download"},
    {"employee_id": 13, "name": "W-2 Tax Form - 2024", "document_type": "w2", "category": "Tax Forms", "document_date": date(2025, 1, 30), "file_size": "91 KB", "download_url": "/api/portal/my-hr/documents/10/download"},
    # Employee id=143 - used by test_supervisor user
    {"employee_id": 143, "name": "Pay Stub - January 2026", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2026, 1, 31), "file_size": "122 KB", "download_url": "/api/portal/my-hr/documents/11/download"},
    {"employee_id": 143, "name": "Pay Stub - December 2025", "document_type": "pay_stub", "category": "Pay Stubs", "document_date": date(2025, 12, 30), "file_size": "118 KB", "download_url": "/api/portal/my-hr/documents/12/download"},
    {"employee_id": 143, "name": "W-2 Tax Form - 2024", "document_type": "w2", "category": "Tax Forms", "document_date": date(2025, 1, 30), "file_size": "87 KB", "download_url": "/api/portal/my-hr/documents/13/download"},
    {"employee_id": 143, "name": "Offer Letter", "document_type": "offer_letter", "category": "Offer Letters", "document_date": date(2022, 6, 1), "file_size": "148 KB", "download_url": "/api/portal/my-hr/documents/14/download"},
    {"employee_id": 143, "name": "Benefits Summary - 2025", "document_type": "benefits_summary", "category": "Benefits", "document_date": date(2025, 1, 1), "file_size": "203 KB", "download_url": "/api/portal/my-hr/documents/15/download"},
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(models.EmployeeDocument).count()
        if existing > 0:
            logger.warning(f"employee_documents table already has {existing} records, skipping seed.")
            return

        for doc_data in SAMPLE_DOCS:
            doc = models.EmployeeDocument(**doc_data)
            db.add(doc)

        db.commit()
        logger.info(f"Seeded {len(SAMPLE_DOCS)} employee documents successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
