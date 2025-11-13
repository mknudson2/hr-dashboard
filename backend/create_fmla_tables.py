#!/usr/bin/env python3
"""Create FMLA Leave Request tables in the database"""

from app.db.database import Base, engine
from app.db import models

# Import the model to register it with SQLAlchemy
_ = models.FMLALeaveRequest

# Create all tables
Base.metadata.create_all(bind=engine)

print("✅ FMLA tables created successfully!")
