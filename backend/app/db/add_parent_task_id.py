"""
Add parent_task_id column to offboarding_tasks table to support nested/hierarchical tasks
"""
import logging
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

logger = logging.getLogger(__name__)

def add_parent_task_id_column():
    """Add parent_task_id column to support task hierarchy"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    try:
        logger.info("Adding parent_task_id column to offboarding_tasks table...")
        logger.info("=" * 60)

        with engine.connect() as connection:
            # Check if column already exists
            result = connection.execute(text("PRAGMA table_info(offboarding_tasks)"))
            columns = [row[1] for row in result.fetchall()]

            if 'parent_task_id' in columns:
                logger.info("parent_task_id column already exists")
                return

            # Add the column
            connection.execute(text("""
                ALTER TABLE offboarding_tasks
                ADD COLUMN parent_task_id INTEGER
                REFERENCES offboarding_tasks(id)
            """))
            connection.commit()

            logger.info("Successfully added parent_task_id column")

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
                logger.info("Successfully added has_subtasks column")

            if 'is_subtask' not in columns:
                connection.execute(text("""
                    ALTER TABLE offboarding_tasks
                    ADD COLUMN is_subtask BOOLEAN DEFAULT 0
                """))
                connection.commit()
                logger.info("Successfully added is_subtask column")

        logger.info("=" * 60)
        logger.info("Migration completed successfully!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error("Error adding parent_task_id column: %s", e)
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    add_parent_task_id_column()
