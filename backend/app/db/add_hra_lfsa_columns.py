"""Add HRA and LFSA contribution columns to employees table."""
from sqlalchemy import create_engine, text, inspect
from app.db.database import SQLALCHEMY_DATABASE_URL

def add_hra_lfsa_columns():
    """Add HRA and LFSA contribution columns."""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    inspector = inspect(engine)

    with engine.connect() as conn:
        # Get existing columns for SQLite
        columns = [col['name'] for col in inspector.get_columns('employees')]

        # Add HRA employer contribution column if it doesn't exist
        if 'hra_er_contribution' not in columns:
            print("Adding hra_er_contribution column...")
            conn.execute(text("""
                ALTER TABLE employees
                ADD COLUMN hra_er_contribution REAL DEFAULT 0.0
            """))
            conn.commit()
            print("✓ Added hra_er_contribution column")
        else:
            print("✓ hra_er_contribution column already exists")

        # Add LFSA contribution column if it doesn't exist
        if 'lfsa_contribution' not in columns:
            print("Adding lfsa_contribution column...")
            conn.execute(text("""
                ALTER TABLE employees
                ADD COLUMN lfsa_contribution REAL DEFAULT 0.0
            """))
            conn.commit()
            print("✓ Added lfsa_contribution column")
        else:
            print("✓ lfsa_contribution column already exists")

        print("\n✅ Database migration complete!")

if __name__ == "__main__":
    add_hra_lfsa_columns()
