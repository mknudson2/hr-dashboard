"""
Add parent_task_id column to offboarding_tasks table to support nested/hierarchical tasks
"""
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

def add_parent_task_id_column():
    """Add parent_task_id column to support task hierarchy"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    try:
        print("\n📋 Adding parent_task_id column to offboarding_tasks table...")
        print("=" * 60)

        with engine.connect() as connection:
            # Check if column already exists
            result = connection.execute(text("PRAGMA table_info(offboarding_tasks)"))
            columns = [row[1] for row in result.fetchall()]

            if 'parent_task_id' in columns:
                print("✓ parent_task_id column already exists")
                return

            # Add the column
            connection.execute(text("""
                ALTER TABLE offboarding_tasks
                ADD COLUMN parent_task_id INTEGER
                REFERENCES offboarding_tasks(id)
            """))
            connection.commit()

            print("✓ Successfully added parent_task_id column")

        # Also add has_subtasks and is_subtask flags for easier querying
        with engine.connect() as connection:
            result = connection.execute(text("PRAGMA table_info(offboarding_tasks)"))
            columns = [row[1] for row in result.fetchall()]

            if 'has_subtasks' not in columns:
                connection.execute(text("""
                    ALTER TABLE offboarding_tasks
                    ADD COLUMN has_subtasks BOOLEAN DEFAULT 0
                """))
                connection.commit()
                print("✓ Successfully added has_subtasks column")

            if 'is_subtask' not in columns:
                connection.execute(text("""
                    ALTER TABLE offboarding_tasks
                    ADD COLUMN is_subtask BOOLEAN DEFAULT 0
                """))
                connection.commit()
                print("✓ Successfully added is_subtask column")

        print("=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error adding parent_task_id column: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    add_parent_task_id_column()
