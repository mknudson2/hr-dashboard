"""
Add uncheck_history column to offboarding_tasks table
This column will store a JSON array of uncheck events with timestamp and reason
"""
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

def add_uncheck_history_column():
    """Add uncheck_history JSON column to offboarding_tasks"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    try:
        print("\n🔧 Adding uncheck_history column to offboarding_tasks...")
        print("=" * 60)

        with engine.connect() as connection:
            # Check if column already exists
            result = connection.execute(text("""
                SELECT COUNT(*) as count
                FROM pragma_table_info('offboarding_tasks')
                WHERE name = 'uncheck_history'
            """))

            exists = result.fetchone()[0] > 0

            if exists:
                print("✓ Column 'uncheck_history' already exists. Skipping migration.")
                return

            # Add the column
            connection.execute(text("""
                ALTER TABLE offboarding_tasks
                ADD COLUMN uncheck_history TEXT
            """))

            connection.commit()

            print("✅ Successfully added uncheck_history column!")
            print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error adding uncheck_history column: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    add_uncheck_history_column()
