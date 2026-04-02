"""
Create ACA (Affordable Care Act) compliance tables
"""
from sqlalchemy import create_engine
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db.models import Base, ACAMeasurementPeriod, ACAEmployeeStatus, ACAMonthlyHours, ACACoverageOffer, ACAForm1095C, ACAForm1094C, ACAAlert
import logging

logger = logging.getLogger(__name__)

def create_aca_tables():
    """Create all ACA-related tables"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

    # Create tables
    Base.metadata.create_all(bind=engine, tables=[
        ACAMeasurementPeriod.__table__,
        ACAEmployeeStatus.__table__,
        ACAMonthlyHours.__table__,
        ACACoverageOffer.__table__,
        ACAForm1095C.__table__,
        ACAForm1094C.__table__,
        ACAAlert.__table__,
    ])

    logger.info("ACA tables created successfully")
    logger.info("- aca_measurement_periods")
    logger.info("- aca_employee_status")
    logger.info("- aca_monthly_hours")
    logger.info("- aca_coverage_offers")
    logger.info("- aca_form_1095c")
    logger.info("- aca_form_1094c")
    logger.info("- aca_alerts")

if __name__ == "__main__":
    create_aca_tables()
