from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from app.db import models, database, crud
from app.api import analytics, employees, notifications, fmla, garnishments, turnover, events, compensation, market_data, performance, onboarding, offboarding, equipment, contribution_limits, pto, auth, users, aca, eeo, settings, emails, file_uploads, sftp, payroll, capitalized_labor, capitalized_labor_admin
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.scheduler_service import scheduler as sftp_scheduler
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    print("🚀 Starting HR Dashboard API...")
    start_scheduler()
    sftp_scheduler.start()
    yield
    # Shutdown
    print("🛑 Shutting down HR Dashboard API...")
    stop_scheduler()
    sftp_scheduler.stop()

# Initialize FastAPI app with lifespan
app = FastAPI(title="HR Dashboard API", lifespan=lifespan)

# Allow frontend (Vite) requests
app.add_middleware(
    CORSMiddleware,
    # Adjust if frontend runs elsewhere
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
models.Base.metadata.create_all(bind=database.engine)

# Dependency to get DB session


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Root check endpoint


@app.get("/")
def root():
    return {"message": "HR Dashboard API is running successfully!"}


# Include Routers
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(fmla.router)
app.include_router(garnishments.router)
app.include_router(turnover.router)
app.include_router(events.router)
app.include_router(compensation.router)
app.include_router(market_data.router)
app.include_router(performance.router)
app.include_router(onboarding.router)
app.include_router(offboarding.router)
app.include_router(equipment.router)
app.include_router(contribution_limits.router)
app.include_router(pto.router)
app.include_router(users.router)
app.include_router(aca.router)
app.include_router(eeo.router)
app.include_router(settings.router)
app.include_router(emails.router)
app.include_router(file_uploads.router)
app.include_router(sftp.router)
app.include_router(payroll.router)
app.include_router(capitalized_labor.router)
app.include_router(capitalized_labor_admin.router, prefix="/capitalized-labor")
