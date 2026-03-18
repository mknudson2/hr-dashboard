"""
Add employment_type column to employees table
"""
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

def add_employment_type_column():
    """Add employment_type column to employees table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    with engine.connect() as connection:
        try:
            # Add employment_type column
            connection.execute(text("ALTER TABLE employees ADD COLUMN employment_type VARCHAR"))
            connection.commit()
            print("✓ Added column: employment_type")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  Column employment_type already exists, skipping")
            else:
                print(f"✗ Error adding column employment_type: {e}")
                return

        # Populate employment_type based on existing 'type' field if it exists
        try:
            # Set default to "Full Time" for active employees
            connection.execute(text("""
                UPDATE employees
                SET employment_type = 'Full Time'
                WHERE employment_type IS NULL AND status = 'Active'
            """))
            connection.commit()
            print("✓ Set default employment_type for active employees")
        except Exception as e:
            print(f"  Note: Could not set defaults: {e}")

    print("\n✓ Employment type column migration completed successfully")

if __name__ == "__main__":
    add_employment_type_column()
