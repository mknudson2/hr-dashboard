import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# --- Base Directory ---
BASE_DIR = os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))
)

# --- Database Path ---
DB_PATH = os.path.join(BASE_DIR, "data", "hr_dashboard.db")

# --- Connection URL ---
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# --- Engine Setup ---
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
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
