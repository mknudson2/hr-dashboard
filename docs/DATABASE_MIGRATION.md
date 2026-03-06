# Database Migration Guide: SQLite to PostgreSQL

This guide provides step-by-step instructions for migrating the HR Dashboard database from SQLite (development) to PostgreSQL (production).

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Migration Methods](#migration-methods)
4. [Method 1: pgloader (Recommended)](#method-1-pgloader-recommended)
5. [Method 2: Manual Export/Import](#method-2-manual-exportimport)
6. [Method 3: Application-Level Migration](#method-3-application-level-migration)
7. [Post-Migration Steps](#post-migration-steps)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedure](#rollback-procedure)

---

## Overview

### Why Migrate to PostgreSQL?

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Concurrent writes | Single writer | Multiple writers |
| Scalability | Limited | Excellent |
| Full-text search | Basic | Advanced |
| JSON support | Limited | Full JSONB |
| Backup/replication | Manual | Built-in |
| Production support | Not recommended | Industry standard |

### Migration Scope

The migration involves:
- All database tables (employees, users, sessions, etc.)
- All data records
- Indexes and constraints
- Sequences for auto-increment fields

---

## Prerequisites

### 1. PostgreSQL Server

Ensure PostgreSQL is installed and running:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Or on macOS with Homebrew
brew services list | grep postgresql
```

### 2. Create Database and User

```sql
-- Connect as postgres superuser
sudo -u postgres psql

-- Create database
CREATE DATABASE hr_dashboard;

-- Create application user
CREATE USER hr_app WITH ENCRYPTED PASSWORD 'your-secure-password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hr_dashboard TO hr_app;

-- Connect to the database
\c hr_dashboard

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO hr_app;

-- Exit
\q
```

### 3. Install psycopg2

Already included in requirements.txt:
```bash
pip install psycopg2-binary
```

### 4. Backup SQLite Database

**CRITICAL: Always backup before migration**

```bash
# Create backup
cp backend/data/hr_dashboard.db backend/data/hr_dashboard_backup_$(date +%Y%m%d).db

# Verify backup
ls -la backend/data/*.db
```

---

## Migration Methods

| Method | Complexity | Speed | Best For |
|--------|------------|-------|----------|
| pgloader | Low | Fast | Most cases |
| Manual Export/Import | Medium | Medium | Custom transformations |
| Application-Level | High | Slow | Complex data validation |

---

## Method 1: pgloader (Recommended)

[pgloader](https://pgloader.io/) is a tool designed for database migrations.

### Install pgloader

```bash
# Ubuntu/Debian
sudo apt-get install pgloader

# macOS
brew install pgloader

# Or from source
git clone https://github.com/dimitri/pgloader.git
```

### Create Migration Script

Create file `migrate.load`:
```
LOAD DATABASE
    FROM sqlite:///path/to/backend/data/hr_dashboard.db
    INTO postgresql://hr_app:password@localhost:5432/hr_dashboard

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB'

CAST type datetime to timestamp using zero-dates-to-null,
     type date to date using zero-dates-to-null;
```

### Run Migration

```bash
pgloader migrate.load
```

### Verify Migration

```bash
# Connect to PostgreSQL
psql -h localhost -U hr_app -d hr_dashboard

# Count tables
\dt

# Check record counts
SELECT
    (SELECT COUNT(*) FROM employees) as employees,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM sessions) as sessions;
```

---

## Method 2: Manual Export/Import

For more control over the migration process.

### Step 1: Export from SQLite

```bash
# Export schema
sqlite3 backend/data/hr_dashboard.db ".schema" > schema.sql

# Export data as INSERT statements
sqlite3 backend/data/hr_dashboard.db ".mode insert" ".output data.sql" "SELECT * FROM employees;"
# Repeat for each table
```

### Step 2: Convert Schema

SQLite and PostgreSQL have syntax differences. Common conversions:

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `DATETIME` | `TIMESTAMP` |
| `TEXT` | `TEXT` or `VARCHAR` |
| `BLOB` | `BYTEA` |
| `BOOLEAN` (0/1) | `BOOLEAN` (true/false) |

### Step 3: Create Tables in PostgreSQL

The application can create tables automatically:

```bash
# Set DATABASE_URL to PostgreSQL
export DATABASE_URL="postgresql://hr_app:password@localhost:5432/hr_dashboard"

# Start app briefly to create tables
python -c "from app.db.database import engine; from app.db.models import Base; Base.metadata.create_all(engine)"
```

### Step 4: Import Data

```bash
# Import using psql
psql -h localhost -U hr_app -d hr_dashboard -f data.sql
```

---

## Method 3: Application-Level Migration

Use Python to read from SQLite and write to PostgreSQL with validation.

### Migration Script

Create `migrate_database.py`:

```python
#!/usr/bin/env python3
"""
Database Migration Script: SQLite to PostgreSQL
"""
import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Source: SQLite
SQLITE_URL = "sqlite:///backend/data/hr_dashboard.db"

# Target: PostgreSQL (set via environment or hardcode for migration)
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://hr_app:password@localhost:5432/hr_dashboard")

def migrate():
    print(f"Starting migration at {datetime.now()}")

    # Connect to both databases
    sqlite_engine = create_engine(SQLITE_URL)
    postgres_engine = create_engine(POSTGRES_URL)

    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)

    sqlite_session = SQLiteSession()
    postgres_session = PostgresSession()

    # Get list of tables
    tables = sqlite_engine.execute(text(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )).fetchall()

    for (table_name,) in tables:
        print(f"Migrating table: {table_name}")

        # Read all rows from SQLite
        rows = sqlite_session.execute(text(f"SELECT * FROM {table_name}")).fetchall()

        if not rows:
            print(f"  No data in {table_name}")
            continue

        # Get column names
        columns = rows[0].keys()

        # Insert into PostgreSQL
        for row in rows:
            values = dict(row)

            # Build INSERT statement
            cols = ", ".join(columns)
            placeholders = ", ".join([f":{col}" for col in columns])
            insert_sql = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"

            try:
                postgres_session.execute(text(insert_sql), values)
            except Exception as e:
                print(f"  Error inserting row: {e}")
                continue

        postgres_session.commit()
        print(f"  Migrated {len(rows)} rows")

    # Reset sequences
    print("Resetting sequences...")
    for (table_name,) in tables:
        try:
            # Find primary key column (assuming 'id')
            postgres_session.execute(text(f"""
                SELECT setval(pg_get_serial_sequence('{table_name}', 'id'),
                       COALESCE((SELECT MAX(id) FROM {table_name}), 1))
            """))
        except:
            pass  # Table may not have 'id' column

    postgres_session.commit()

    print(f"Migration completed at {datetime.now()}")

    sqlite_session.close()
    postgres_session.close()

if __name__ == "__main__":
    migrate()
```

### Run Migration

```bash
python migrate_database.py
```

---

## Post-Migration Steps

### 1. Update Configuration

Update `.env` to use PostgreSQL:
```bash
DATABASE_URL=postgresql://hr_app:password@localhost:5432/hr_dashboard
```

### 2. Verify Data Integrity

```sql
-- Connect to PostgreSQL
psql -h localhost -U hr_app -d hr_dashboard

-- Check row counts match SQLite
SELECT 'employees' as table_name, COUNT(*) as count FROM employees
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;

-- Spot check specific records
SELECT id, full_name, email FROM employees LIMIT 5;
```

### 3. Test Application

```bash
# Start application with PostgreSQL
export DATABASE_URL="postgresql://hr_app:password@localhost:5432/hr_dashboard"
uvicorn app.main:app --reload

# Test endpoints
curl http://localhost:8000/
curl http://localhost:8000/employees
```

### 4. Update Indexes (if needed)

PostgreSQL may need additional indexes for performance:

```sql
-- Example: Add index for frequently queried columns
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### 5. Configure Backups

Set up automated PostgreSQL backups:

```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U hr_app hr_dashboard | gzip > /backups/hr_dashboard_$(date +\%Y\%m\%d).sql.gz
```

---

## Troubleshooting

### Connection Issues

**Error: "could not connect to server"**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check pg_hba.conf for authentication settings
sudo cat /etc/postgresql/*/main/pg_hba.conf
```

**Error: "password authentication failed"**
```bash
# Reset user password
sudo -u postgres psql -c "ALTER USER hr_app WITH PASSWORD 'new-password';"
```

### Data Type Issues

**Error: "invalid input syntax for type boolean"**
- SQLite stores booleans as 0/1
- PostgreSQL expects true/false
- Solution: Cast during import
```sql
UPDATE table_name SET bool_column = (int_column = 1);
```

**Error: "invalid input syntax for type timestamp"**
- Check date format compatibility
- Solution: Parse and convert dates during migration

### Sequence Issues

**Error: "duplicate key value violates unique constraint"**
- Auto-increment sequence not reset after import
- Solution:
```sql
SELECT setval(pg_get_serial_sequence('table_name', 'id'),
       (SELECT MAX(id) FROM table_name));
```

### Performance Issues

**Slow queries after migration**
- Run ANALYZE to update statistics:
```sql
ANALYZE;
```
- Check for missing indexes
- Review query plans with EXPLAIN ANALYZE

---

## Rollback Procedure

If migration fails or issues are discovered:

### 1. Stop Application

```bash
# Stop the application
systemctl stop hr-dashboard
```

### 2. Revert Configuration

```bash
# Edit .env
# Comment out or remove DATABASE_URL to use SQLite
# DATABASE_URL=postgresql://...
```

### 3. Restore SQLite Backup (if needed)

```bash
cp backend/data/hr_dashboard_backup_YYYYMMDD.db backend/data/hr_dashboard.db
```

### 4. Restart Application

```bash
systemctl start hr-dashboard
```

### 5. Investigate Issues

- Check application logs
- Review PostgreSQL logs
- Compare data between databases

---

## Checklist

### Pre-Migration
- [ ] PostgreSQL server installed and running
- [ ] Database and user created
- [ ] SQLite database backed up
- [ ] Migration method chosen
- [ ] Downtime window scheduled

### Migration
- [ ] Schema created in PostgreSQL
- [ ] Data migrated
- [ ] Sequences reset
- [ ] Data counts verified

### Post-Migration
- [ ] Configuration updated to PostgreSQL
- [ ] Application tested
- [ ] Performance verified
- [ ] Backups configured
- [ ] Old SQLite file archived (not deleted)
