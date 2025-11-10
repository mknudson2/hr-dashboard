"""
Migration script to create authentication tables
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import bcrypt

# Get database path
DB_PATH = Path(__file__).parent.parent.parent / "data" / "hr_dashboard.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)


def migrate():
    """Create authentication tables"""
    print("Starting migration to create authentication tables...")

    db = SessionLocal()

    try:
        # Create users table
        print("\n1. Creating users table...")
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                last_login DATETIME,
                FOREIGN KEY(employee_id) REFERENCES employees (employee_id)
            )
        """))
        db.commit()
        print("   ✓ Created users table")

        # Create sessions table for tracking active sessions
        print("\n2. Creating sessions table...")
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
        print("   ✓ Created sessions table")

        # Create indexes
        print("\n3. Creating indexes...")
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
        print("   ✓ Created indexes")

        # Create default admin user
        print("\n4. Creating default admin user...")

        # Check if admin already exists
        result = db.execute(text("SELECT COUNT(*) as count FROM users WHERE username = 'admin'"))
        count = result.fetchone()[0]

        if count == 0:
            # Hash the default password
            password = "admin123"  # Change this in production!
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            db.execute(text("""
                INSERT INTO users (username, email, password_hash, full_name, role, is_active)
                VALUES (:username, :email, :password_hash, :full_name, :role, :is_active)
            """), {
                "username": "admin",
                "email": "admin@company.com",
                "password_hash": password_hash,
                "full_name": "System Administrator",
                "role": "admin",
                "is_active": 1
            })

            db.commit()
            print("   ✓ Created admin user (username: admin, password: admin123)")
            print("   ⚠️  IMPORTANT: Change the admin password after first login!")
        else:
            print("   - Admin user already exists, skipping")

        # Create Michael Knudson user
        print("\n5. Creating Michael Knudson user...")
        result = db.execute(text("SELECT COUNT(*) as count FROM users WHERE username = 'mknudson'"))
        count = result.fetchone()[0]

        if count == 0:
            password = "welcome123"  # Change this!
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            db.execute(text("""
                INSERT INTO users (username, email, password_hash, full_name, role, is_active)
                VALUES (:username, :email, :password_hash, :full_name, :role, :is_active)
            """), {
                "username": "mknudson",
                "email": "mknudson@company.com",
                "password_hash": password_hash,
                "full_name": "Michael Knudson",
                "role": "admin",
                "is_active": 1
            })

            db.commit()
            print("   ✓ Created Michael Knudson user (username: mknudson, password: welcome123)")
        else:
            print("   - Michael Knudson user already exists, skipping")

        print("\n✅ Migration completed successfully!")
        print("\n📝 Default Credentials:")
        print("   Username: admin / Password: admin123")
        print("   Username: mknudson / Password: welcome123")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
