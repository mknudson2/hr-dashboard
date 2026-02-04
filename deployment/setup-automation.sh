#!/bin/bash
# =============================================================================
# HR Dashboard - Automation Setup
# =============================================================================
# Run this AFTER initial deployment to set up:
# - Automatic security updates
# - Automatic log rotation
# - Disk space monitoring
# - Health check endpoint
#
# Usage: sudo bash setup-automation.sh
# =============================================================================

set -e

echo "========================================"
echo "Setting up automation..."
echo "========================================"

# -----------------------------------------------------------------------------
# 1. Automatic Security Updates
# -----------------------------------------------------------------------------
echo "[1/4] Configuring automatic security updates..."

apt install -y unattended-upgrades

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Automatically reboot if required (at 3 AM)
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Email notifications (optional - configure if desired)
// Unattended-Upgrade::Mail "your-email@example.com";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

echo "  ✓ Security updates will be applied automatically"

# -----------------------------------------------------------------------------
# 2. Log Rotation
# -----------------------------------------------------------------------------
echo "[2/4] Configuring log rotation..."

cat > /etc/logrotate.d/hr-dashboard << 'EOF'
/var/log/hr-dashboard/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload hr-dashboard > /dev/null 2>&1 || true
    endscript
}
EOF

echo "  ✓ Logs will be rotated daily, kept for 14 days"

# -----------------------------------------------------------------------------
# 3. Disk Space Monitoring
# -----------------------------------------------------------------------------
echo "[3/4] Setting up disk space monitoring..."

cat > /usr/local/bin/check-disk-space.sh << 'EOF'
#!/bin/bash
# Alert if disk usage exceeds 80%

THRESHOLD=80
CURRENT=$(df / | grep / | awk '{ print $5}' | sed 's/%//g')

if [ "$CURRENT" -gt "$THRESHOLD" ]; then
    echo "WARNING: Disk usage is ${CURRENT}% on $(hostname)" | \
        mail -s "Disk Space Alert" root 2>/dev/null || \
        echo "WARNING: Disk usage is ${CURRENT}% on $(hostname)" >> /var/log/hr-dashboard/disk-alert.log
fi
EOF

chmod +x /usr/local/bin/check-disk-space.sh

# Add to crontab (runs daily at 8 AM)
(crontab -l 2>/dev/null | grep -v "check-disk-space"; echo "0 8 * * * /usr/local/bin/check-disk-space.sh") | crontab -

echo "  ✓ Disk space checked daily, alerts if >80% full"

# -----------------------------------------------------------------------------
# 4. Daily Backup (ensure it's scheduled)
# -----------------------------------------------------------------------------
echo "[4/4] Ensuring backup schedule..."

BACKUP_SCRIPT="/var/www/hr-dashboard/deployment/backup.sh"
if [ -f "$BACKUP_SCRIPT" ]; then
    chmod +x "$BACKUP_SCRIPT"
    (crontab -l 2>/dev/null | grep -v "backup.sh"; echo "0 2 * * * $BACKUP_SCRIPT >> /var/log/hr-dashboard/backup.log 2>&1") | crontab -
    echo "  ✓ Backups scheduled daily at 2 AM"
else
    echo "  ⚠ Backup script not found at $BACKUP_SCRIPT"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "========================================"
echo "Automation setup complete!"
echo "========================================"
echo ""
echo "What's now automated:"
echo "  • Security updates: Applied automatically, reboot at 3 AM if needed"
echo "  • Log rotation: Daily, keeps 14 days"
echo "  • Disk monitoring: Daily check, logs warning if >80%"
echo "  • Backups: Daily at 2 AM"
echo ""
echo "Your remaining tasks:"
echo "  • Reboot occasionally after kernel updates (or let auto-reboot handle it)"
echo "  • Check in monthly to verify things are running"
echo "  • Review logs if issues arise"
echo ""
echo "Optional: Set up free uptime monitoring at https://uptimerobot.com"
echo "  (Alerts you by email/SMS if your site goes down)"
echo ""
