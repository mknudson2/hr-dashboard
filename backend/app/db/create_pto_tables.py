"""
Migration script to create PTO tracking tables
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Get database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "hr_dashboard.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)


def migrate():
    """Create PTO tracking tables"""
    print("Starting migration to create PTO tracking tables...")

    db = SessionLocal()

    try:
        # Create pto_records table
        print("\n1. Creating pto_records table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS pto_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id VARCHAR NOT NULL,
                cost_center VARCHAR NOT NULL,
                pay_period_date DATE NOT NULL,
                pto_hours REAL DEFAULT 0,
                pto_cost REAL DEFAULT 0,
                hourly_rate REAL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY(employee_id) REFERENCES employees (employee_id),
                UNIQUE(employee_id, pay_period_date)
            )
        """))
        db.commit()
        print("   ✓ Created pto_records table")

        # Create indexes
        print("\n2. Creating indexes...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_pto_employee_id
            ON pto_records (employee_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_pto_cost_center
            ON pto_records (cost_center)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_pto_pay_period
            ON pto_records (pay_period_date)
        """))
        db.commit()
        print("   ✓ Created indexes")

        # Create pto_import_history table to track imports
        print("\n3. Creating pto_import_history table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS pto_import_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name VARCHAR NOT NULL,
                import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                imported_by VARCHAR,
                records_imported INTEGER DEFAULT 0,
                start_date DATE,
                end_date DATE,
                notes TEXT,
                status VARCHAR DEFAULT 'success'
            )
        """))
        db.commit()
        print("   ✓ Created pto_import_history table")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
