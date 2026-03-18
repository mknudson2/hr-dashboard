import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# --- Base Directory ---
BASE_DIR = os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))
)

# --- Database Configuration ---
# Support for PostgreSQL (production) or SQLite (development)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production: Use DATABASE_URL (PostgreSQL, MySQL, etc.)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
else:
    # Development fallback: SQLite
    DB_PATH = os.path.join(BASE_DIR, "data", "hr_dashboard.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# --- Connection Arguments ---
# SQLite requires check_same_thread=False for FastAPI
# PostgreSQL and other databases don't need this
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

# --- Engine Setup ---
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

# --- Session Factory ---
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Base Model ---
Base = declarative_base()


# --- Database Dependency for FastAPI ---
def get_db():
    """
    Dependency that provides a SQLAlchemy session and ensures proper cleanup.
    Usage: `db: Session = Depends(get_db)`
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
