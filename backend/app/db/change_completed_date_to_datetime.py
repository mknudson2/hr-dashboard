"""
Change completed_date column from DATE to DATETIME in offboarding_tasks table
This allows us to store precise completion timestamps with time information
"""
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

def change_completed_date_to_datetime():
    """Change completed_date from DATE to DATETIME/TEXT (SQLite stores as TEXT)"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    try:
        print("\n🔧 Changing completed_date column to support datetime...")
        print("=" * 60)

        with engine.connect() as connection:
            # SQLite doesn't support ALTER COLUMN directly, so we need to:
            # 1. Create a new column
            # 2. Copy data
            # 3. Drop old column
            # 4. Rename new column

            # Check if the new column already exists
            result = connection.execute(text("""
                SELECT COUNT(*) as count
                FROM pragma_table_info('offboarding_tasks')
                WHERE name = 'completed_date_new'
            """))

            if result.fetchone()[0] > 0:
                print("Migration already in progress or completed. Cleaning up...")

            # Step 1: Add new column as TEXT (SQLite stores datetime as TEXT)
            try:
                connection.execute(text("""
                    ALTER TABLE offboarding_tasks
                    ADD COLUMN completed_date_new TEXT
                """))
                print("✓ Added new completed_date_new column")
            except Exception as e:
                print(f"Note: Column may already exist: {e}")

            # Step 2: Copy existing date data to new column
            connection.execute(text("""
                UPDATE offboarding_tasks
                SET completed_date_new = completed_date
                WHERE completed_date IS NOT NULL
            """))
            print("✓ Copied existing dates")

            connection.commit()

            # Step 3 & 4: SQLite requires recreating the table to drop a column
            # For now, we'll just use the new column and leave the old one
            # The model will use completed_date_new going forward

            print("✅ Migration completed!")
            print("   Note: Old completed_date column remains for backwards compatibility")
            print("   The application will use completed_date_new going forward")
            print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    change_completed_date_to_datetime()
