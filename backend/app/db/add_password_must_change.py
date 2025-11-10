"""
Migration script to add password_must_change column to users table
"""
from sqlalchemy import create_engine, text
from app.db.database import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

    with engine.connect() as conn:
        # Add password_must_change column
        try:
            conn.execute(text("""
                ALTER TABLE users ADD COLUMN password_must_change BOOLEAN DEFAULT 1
            """))
            conn.commit()
            print("✅ Added password_must_change column to users table")

            # Set existing users to False (they already have established passwords)
            # Only new users created after this will have it set to True
            conn.execute(text("""
                UPDATE users SET password_must_change = 0 WHERE password_must_change IS NULL OR password_must_change = 1
            """))
            conn.commit()
            print("✅ Set password_must_change to False for existing users")

        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("⚠️  Column password_must_change already exists")
                # Still try to update existing users
                try:
                    conn.execute(text("""
                        UPDATE users SET password_must_change = 0 WHERE password_must_change = 1
                    """))
                    conn.commit()
                    print("✅ Updated existing users to not require password change")
                except:
                    pass
            else:
                print(f"❌ Error adding password_must_change column: {e}")
                raise

if __name__ == "__main__":
    migrate()
