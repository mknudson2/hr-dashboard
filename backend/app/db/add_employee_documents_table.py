#!/usr/bin/env python3
"""
Create employee_documents table.

Usage:
    python -m app.db.add_employee_documents_table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL


def create_table():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        # Check if table already exists
        result = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='employee_documents'"
        ))
        if result.fetchone():
            print("employee_documents table already exists, skipping.")
            return

        conn.execute(text("""
            CREATE TABLE employee_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL REFERENCES employees(id),
                name VARCHAR NOT NULL,
                document_type VARCHAR NOT NULL,
                category VARCHAR NOT NULL,
                document_date DATE NOT NULL,
                file_size VARCHAR,
                download_url VARCHAR,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER REFERENCES users(id)
            )
        """))
        conn.execute(text(
            "CREATE INDEX ix_employee_documents_employee_id ON employee_documents(employee_id)"
        ))
        conn.commit()
        print("Created employee_documents table successfully.")


if __name__ == "__main__":
    create_table()
