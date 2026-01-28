#!/bin/bash
# =============================================================================
# HR Dashboard - Deployment Script
# =============================================================================
# Run this script to deploy updates to the server
# Usage: sudo bash deploy.sh
#
# This script will:
# - Build frontend applications
# - Copy files to production directories
# - Install/update Python dependencies
# - Run database migrations
# - Restart services
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_ROOT="/var/www/hr-dashboard"
REPO_PATH="/home/deploy/hr-dashboard"  # Where you clone/upload the code

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HR Dashboard - Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo bash deploy.sh)${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Backup Database
# -----------------------------------------------------------------------------
echo -e "${GREEN}[1/7] Backing up database...${NC}"
if [ -f "$APP_ROOT/backend/data/hr_dashboard.db" ]; then
    BACKUP_NAME="hr_dashboard_$(date +%Y%m%d_%H%M%S).db"
    cp "$APP_ROOT/backend/data/hr_dashboard.db" "/var/backups/$BACKUP_NAME"
    echo "  Backup created: /var/backups/$BACKUP_NAME"
else
    echo "  No existing database to backup"
fi

# -----------------------------------------------------------------------------
# Build Frontend Applications
# -----------------------------------------------------------------------------
echo -e "${GREEN}[2/7] Building HR Hub frontend...${NC}"
cd "$REPO_PATH/frontend"
npm ci --production=false
npm run build

echo -e "${GREEN}[3/7] Building Employee Portal...${NC}"
cd "$REPO_PATH/employee-portal"
npm ci --production=false
npm run build

# -----------------------------------------------------------------------------
# Deploy Frontend Files
# -----------------------------------------------------------------------------
echo -e "${GREEN}[4/7] Deploying frontend files...${NC}"
rm -rf "$APP_ROOT/frontend/*"
cp -r "$REPO_PATH/frontend/dist/"* "$APP_ROOT/frontend/"

rm -rf "$APP_ROOT/employee-portal/*"
cp -r "$REPO_PATH/employee-portal/dist/"* "$APP_ROOT/employee-portal/"

# -----------------------------------------------------------------------------
# Deploy Backend
# -----------------------------------------------------------------------------
echo -e "${GREEN}[5/7] Deploying backend...${NC}"

# Copy backend files (excluding venv and data)
rsync -av --exclude='venv' --exclude='data' --exclude='__pycache__' \
    "$REPO_PATH/backend/" "$APP_ROOT/backend/"

# Create/update virtual environment
cd "$APP_ROOT/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn[standard]
deactivate

# Ensure data directory exists
mkdir -p "$APP_ROOT/backend/data"

# -----------------------------------------------------------------------------
# Set Permissions
# -----------------------------------------------------------------------------
echo -e "${GREEN}[6/7] Setting permissions...${NC}"
chown -R www-data:www-data "$APP_ROOT"
chmod -R 755 "$APP_ROOT"
chmod 600 "$APP_ROOT/backend/.env.production" 2>/dev/null || true

# -----------------------------------------------------------------------------
# Install/Update Services
# -----------------------------------------------------------------------------
echo -e "${GREEN}[7/7] Restarting services...${NC}"

# Copy and enable systemd service
cp "$REPO_PATH/deployment/hr-dashboard.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable hr-dashboard
systemctl restart hr-dashboard

# Copy and enable Nginx config
cp "$REPO_PATH/deployment/nginx.conf" /etc/nginx/sites-available/hr-dashboard
ln -sf /etc/nginx/sites-available/hr-dashboard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/hr-dashboard-initial 2>/dev/null || true
nginx -t && systemctl reload nginx

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service status:"
systemctl status hr-dashboard --no-pager | head -5
echo ""
echo "Check logs with: sudo journalctl -u hr-dashboard -f"
