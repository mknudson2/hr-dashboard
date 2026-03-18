from . import models
from sqlalchemy.orm import Session


def get_employees(db: Session):
    return db.query(models.Employee).all()


def add_employee(db: Session, emp: models.Employee):
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp
