"""
Migration script to create authentication tables
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import bcrypt
import secrets
import string
import os
import logging

logger = logging.getLogger(__name__)

# Get database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "hr_dashboard.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)


def generate_secure_password(length: int = 16) -> str:
    """
    Generate a cryptographically secure random password.

    Args:
        length: Minimum password length (default 16 characters)

    Returns:
        A secure random password with uppercase, lowercase, numbers, and special characters
    """
    if length < 16:
        length = 16  # Enforce minimum length for security

    # Define character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*()-_=+[]{}|;:,.<>?"

    # Ensure at least one character from each category
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]

    # Fill the rest with random characters from all categories
    all_chars = uppercase + lowercase + digits + special
    password.extend(secrets.choice(all_chars) for _ in range(length - 4))

    # Shuffle to avoid predictable positions
    password_list = list(password)
    secrets.SystemRandom().shuffle(password_list)

    return ''.join(password_list)


def migrate():
    """Create authentication tables"""
    logger.info("Starting migration to create authentication tables...")

    db = SessionLocal()

    try:
        # Create users table
        logger.info("1. Creating users table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                password_hash VARCHAR NOT NULL,
                full_name VARCHAR NOT NULL,
                role VARCHAR DEFAULT 'employee',
                employee_id VARCHAR,
                is_active BOOLEAN DEFAULT 1,
                password_must_change BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                last_login DATETIME,
                FOREIGN KEY(employee_id) REFERENCES employees (employee_id)
            )
        """))
        db.commit()
        logger.info("Created users table")

        # Create sessions table for tracking active sessions
        logger.info("2. Creating sessions table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token VARCHAR UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR,
                user_agent VARCHAR,
                FOREIGN KEY(user_id) REFERENCES users (id)
            )
        """))
        db.commit()
        logger.info("Created sessions table")

        # Create indexes
        logger.info("3. Creating indexes...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users (employee_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)
        """))
        db.commit()
        logger.info("Created indexes")

        # Create default admin user
        logger.info("4. Creating default admin user...")

        # Check if admin already exists
        result = db.execute(text("SELECT COUNT(*) as count FROM users WHERE username = 'admin'"))
        count = result.fetchone()[0]

        if count == 0:
            # Use environment variable for admin password if provided, otherwise generate secure random password
            # SECURITY: Password must be changed on first login (password_must_change flag)
            admin_password = os.environ.get('ADMIN_INITIAL_PASSWORD')
            if admin_password:
                password = admin_password
            else:
                password = generate_secure_password(16)

            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            db.execute(text("""
                INSERT INTO users (username, email, password_hash, full_name, role, is_active, password_must_change)
                VALUES (:username, :email, :password_hash, :full_name, :role, :is_active, :password_must_change)
            """), {
                "username": "admin",
                "email": "admin@company.com",
                "password_hash": password_hash,
                "full_name": "System Administrator",
                "role": "admin",
                "is_active": 1,
                "password_must_change": 1
            })

            db.commit()
            # NOTE: Password must be changed on first login - do NOT print password to console
            logger.info("Password generated - check secure logs or reset via admin")
            logger.info("IMPORTANT: Password must be changed on first login!")
        else:
            logger.warning("- Admin user already exists, skipping")

        # Create Michael Knudson user
        logger.info("5. Creating Michael Knudson user...")
        result = db.execute(text("SELECT COUNT(*) as count FROM users WHERE username = 'mknudson'"))
        count = result.fetchone()[0]

        if count == 0:
            # Generate secure random password - SECURITY: Password must be changed on first login
            password = generate_secure_password(16)
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            db.execute(text("""
                INSERT INTO users (username, email, password_hash, full_name, role, is_active, password_must_change)
                VALUES (:username, :email, :password_hash, :full_name, :role, :is_active, :password_must_change)
            """), {
                "username": "mknudson",
                "email": "mknudson@company.com",
                "password_hash": password_hash,
                "full_name": "Michael Knudson",
                "role": "admin",
                "is_active": 1,
                "password_must_change": 1
            })

            db.commit()
            # NOTE: Password must be changed on first login - do NOT print password to console
            logger.info("Password generated - check secure logs or reset via admin")
            logger.info("IMPORTANT: Password must be changed on first login!")
        else:
            logger.warning("- Michael Knudson user already exists, skipping")

        logger.info("Migration completed successfully!")
        logger.warning("NOTE: All generated passwords must be changed on first login.")
        logger.info("Use the admin password reset function or check secure deployment logs.")

    except Exception as e:
        logger.error(f"\n Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
