#!/bin/bash
# =============================================================================
# HR Dashboard - Server Setup Script
# =============================================================================
# Run this script ONCE on a fresh Ubuntu 22.04/24.04 server
# Usage: sudo bash setup-server.sh
#
# This script will:
# - Update system packages
# - Install Nginx, Python, Node.js, and dependencies
# - Create directory structure
# - Set up SSL certificates with Let's Encrypt
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HR Dashboard - Server Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo bash setup-server.sh)${NC}"
    exit 1
fi

# Get domain names
read -p "Enter HR Hub domain (e.g., hr.bifrostin.com): " HR_DOMAIN
read -p "Enter Employee Portal domain (e.g., portal.bifrostin.com): " PORTAL_DOMAIN
read -p "Enter your email for SSL certificates: " SSL_EMAIL

echo ""
echo -e "${YELLOW}Setting up server for:${NC}"
echo "  HR Hub: $HR_DOMAIN"
echo "  Portal: $PORTAL_DOMAIN"
echo ""

# -----------------------------------------------------------------------------
# Update System
# -----------------------------------------------------------------------------
echo -e "${GREEN}[1/8] Updating system packages...${NC}"
apt update && apt upgrade -y

# -----------------------------------------------------------------------------
# Install Dependencies
# -----------------------------------------------------------------------------
echo -e "${GREEN}[2/8] Installing dependencies...${NC}"
apt install -y \
    nginx \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    ufw

# -----------------------------------------------------------------------------
# Create Directory Structure
# -----------------------------------------------------------------------------
echo -e "${GREEN}[3/8] Creating directory structure...${NC}"
mkdir -p /var/www/hr-dashboard/{backend,frontend,employee-portal}
mkdir -p /var/www/hr-dashboard/backend/data
mkdir -p /var/log/hr-dashboard
chown -R www-data:www-data /var/www/hr-dashboard
chown -R www-data:www-data /var/log/hr-dashboard

# -----------------------------------------------------------------------------
# Configure Firewall
# -----------------------------------------------------------------------------
echo -e "${GREEN}[4/8] Configuring firewall...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# -----------------------------------------------------------------------------
# Initial Nginx Configuration (HTTP only for SSL setup)
# -----------------------------------------------------------------------------
echo -e "${GREEN}[5/8] Setting up initial Nginx configuration...${NC}"

cat > /etc/nginx/sites-available/hr-dashboard-initial << EOF
server {
    listen 80;
    server_name $HR_DOMAIN $PORTAL_DOMAIN;
    root /var/www/html;
    location / {
        return 200 'Server ready for SSL setup';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hr-dashboard-initial /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# -----------------------------------------------------------------------------
# SSL Certificates
# -----------------------------------------------------------------------------
echo -e "${GREEN}[6/8] Setting up SSL certificates...${NC}"
echo -e "${YELLOW}Make sure your DNS records point to this server!${NC}"
echo "Press Enter when ready..."
read

certbot --nginx -d $HR_DOMAIN -d $PORTAL_DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL

# -----------------------------------------------------------------------------
# Create systemd service
# -----------------------------------------------------------------------------
echo -e "${GREEN}[7/8] Setting up systemd service...${NC}"
# Service file will be copied during deployment

# -----------------------------------------------------------------------------
# Final Setup
# -----------------------------------------------------------------------------
echo -e "${GREEN}[8/8] Final configuration...${NC}"

# Create deployment user (optional, for security)
# useradd -m -s /bin/bash deploy
# usermod -aG www-data deploy

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Server setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Copy your application files to the server"
echo "2. Run the deploy.sh script"
echo "3. Configure your .env.production file"
echo ""
echo "Server details:"
echo "  Application root: /var/www/hr-dashboard"
echo "  Log files: /var/log/hr-dashboard"
echo "  Nginx config: /etc/nginx/sites-available/hr-dashboard"
echo ""
