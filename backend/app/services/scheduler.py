"""Scheduler service for periodic tasks like weekly reports."""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.db.database import SessionLocal
from app.services.notification_service import notification_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def send_weekly_reports_job():
    """Scheduled job to send weekly reports."""
    logger.info("Starting weekly report job...")
    db = SessionLocal()
    try:
        notification_service.send_weekly_reports(db)
        logger.info("✅ Weekly reports sent successfully")
    except Exception as e:
        logger.error(f"❌ Error sending weekly reports: {str(e)}")
    finally:
        db.close()


# Initialize scheduler
scheduler = BackgroundScheduler()


def start_scheduler():
    """Start the background scheduler with scheduled jobs."""
    # Schedule weekly reports for every Monday at 9:00 AM
    scheduler.add_job(
        send_weekly_reports_job,
        trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
        id='weekly_reports',
        name='Send weekly HR reports',
        replace_existing=True
    )

    scheduler.start()
    logger.info("✅ Scheduler started successfully")
    logger.info("📅 Weekly reports scheduled for every Monday at 9:00 AM")


def stop_scheduler():
    """Stop the background scheduler."""
    scheduler.shutdown()
    logger.info("Scheduler stopped")
