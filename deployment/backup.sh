#!/bin/bash
# =============================================================================
# HR Dashboard - Backup Script
# =============================================================================
# Creates a backup of the database and uploaded files
#
# Usage: sudo bash backup.sh
#
# For automated backups, add to crontab:
#   sudo crontab -e
#   # Daily backup at 2 AM
#   0 2 * * * /var/www/hr-dashboard/deployment/backup.sh >> /var/log/hr-dashboard/backup.log 2>&1
# =============================================================================

set -e

# Configuration
APP_ROOT="/var/www/hr-dashboard"
BACKUP_DIR="/var/backups/hr-dashboard"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "HR Dashboard Backup - $DATE"
echo "=========================================="

# -----------------------------------------------------------------------------
# Backup Database
# -----------------------------------------------------------------------------
echo "[1/3] Backing up database..."
if [ -f "$APP_ROOT/backend/data/hr_dashboard.db" ]; then
    cp "$APP_ROOT/backend/data/hr_dashboard.db" "$BACKUP_DIR/hr_dashboard_$DATE.db"
    echo "  Created: $BACKUP_DIR/hr_dashboard_$DATE.db"
else
    echo "  Warning: Database file not found"
fi

# -----------------------------------------------------------------------------
# Backup Uploaded Files (if any)
# -----------------------------------------------------------------------------
echo "[2/3] Backing up uploaded files..."
if [ -d "$APP_ROOT/backend/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$APP_ROOT/backend" uploads
    echo "  Created: $BACKUP_DIR/uploads_$DATE.tar.gz"
else
    echo "  No uploads directory found"
fi

# -----------------------------------------------------------------------------
# Clean Old Backups
# -----------------------------------------------------------------------------
echo "[3/3] Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -type f -name "*.db" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR" | tail -10

echo ""
echo "Backup complete!"
