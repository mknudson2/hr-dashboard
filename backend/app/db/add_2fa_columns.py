#!/usr/bin/env python3
"""
Add 2FA columns to users table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

def add_2fa_columns():
    """Add 2FA-related columns to users table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        try:
            # Add totp_secret column
            conn.execute(text("""
                ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32)
            """))
            print("✓ Added totp_secret column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ totp_secret column already exists")
            else:
                print(f"Error adding totp_secret: {e}")

        try:
            # Add totp_enabled column
            conn.execute(text("""
                ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT 0
            """))
            print("✓ Added totp_enabled column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ totp_enabled column already exists")
            else:
                print(f"Error adding totp_enabled: {e}")

        try:
            # Add backup_codes column (JSON array of hashed backup codes)
            conn.execute(text("""
                ALTER TABLE users ADD COLUMN backup_codes TEXT
            """))
            print("✓ Added backup_codes column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ backup_codes column already exists")
            else:
                print(f"Error adding backup_codes: {e}")

        conn.commit()
        print("\n✅ 2FA columns migration completed successfully!")

if __name__ == "__main__":
    add_2fa_columns()
