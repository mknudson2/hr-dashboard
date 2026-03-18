"""
Create ACA (Affordable Care Act) compliance tables
"""
from sqlalchemy import create_engine
from app.db.database import SQLALCHEMY_DATABASE_URL
from app.db.models import Base, ACAMeasurementPeriod, ACAEmployeeStatus, ACAMonthlyHours, ACACoverageOffer, ACAForm1095C, ACAForm1094C, ACAAlert

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

    print("✓ ACA tables created successfully")
    print("  - aca_measurement_periods")
    print("  - aca_employee_status")
    print("  - aca_monthly_hours")
    print("  - aca_coverage_offers")
    print("  - aca_form_1095c")
    print("  - aca_form_1094c")
    print("  - aca_alerts")

if __name__ == "__main__":
    create_aca_tables()
