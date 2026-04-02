"""
Background Scheduler Service for automated tasks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict
import threading

from app.db import database, models
from app.services.sftp_service import SFTPService

logger = logging.getLogger(__name__)


class SchedulerService:
    """Background scheduler for periodic tasks"""

    def __init__(self):
        self.is_running = False
        self.thread = None
        self.poll_tasks: Dict[int, datetime] = {}  # config_id -> next_poll_time

    def start(self):
        """Start the background scheduler"""
        if self.is_running:
            logger.info("Scheduler already running")
            return

        self.is_running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info("SFTP Scheduler started")

    def stop(self):
        """Stop the background scheduler"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("SFTP Scheduler stopped")

    def _run_scheduler(self):
        """Main scheduler loop (runs in background thread)"""
        while self.is_running:
            try:
                self._check_and_poll()
            except Exception as e:
                logger.error("Scheduler error: %s", str(e))

            # Sleep for 1 minute between checks
            for _ in range(60):
                if not self.is_running:
                    break
                threading.Event().wait(1)

    def _check_and_poll(self):
        """Check for SFTP configs that need polling"""
        db = database.SessionLocal()

        try:
            # Get all active SFTP configurations
            configs = db.query(models.SFTPConfiguration).filter(
                models.SFTPConfiguration.is_active == True
            ).all()

            now = datetime.now()

            for config in configs:
                # Check if it's time to poll this config
                if config.id not in self.poll_tasks:
                    # First time - schedule immediately
                    self.poll_tasks[config.id] = now

                next_poll_time = self.poll_tasks.get(config.id)

                if next_poll_time and now >= next_poll_time:
                    logger.info("Polling SFTP: %s", config.name)

                    # Poll for files
                    success, message, count = SFTPService.poll_for_files(config, db)

                    # Update status
                    SFTPService.update_poll_status(config.id, success, message, db)

                    if success:
                        logger.info("SFTP poll succeeded for %s: %s", config.name, message)
                    else:
                        logger.error("SFTP poll failed for %s: %s", config.name, message)

                    # Schedule next poll
                    self.poll_tasks[config.id] = now + timedelta(minutes=config.poll_frequency)

        finally:
            db.close()

    def trigger_manual_poll(self, config_id: int) -> tuple[bool, str, int]:
        """
        Manually trigger a poll for a specific SFTP configuration

        Args:
            config_id: SFTPConfiguration ID

        Returns:
            Tuple of (success, message, files_downloaded)
        """
        db = database.SessionLocal()

        try:
            config = db.query(models.SFTPConfiguration).filter(
                models.SFTPConfiguration.id == config_id
            ).first()

            if not config:
                return False, "Configuration not found", 0

            # Poll for files
            success, message, count = SFTPService.poll_for_files(config, db)

            # Update status
            SFTPService.update_poll_status(config.id, success, message, db)

            # Update next scheduled poll time
            if config.id in self.poll_tasks:
                self.poll_tasks[config.id] = datetime.now() + timedelta(minutes=config.poll_frequency)

            return success, message, count

        finally:
            db.close()


# Global scheduler instance
scheduler = SchedulerService()
