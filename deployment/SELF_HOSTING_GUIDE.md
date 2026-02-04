# Self-Hosting Guide: HR Dashboard on GMKtec G10

A complete guide to hosting your HR Dashboard on a mini PC in your home using Cloudflare Tunnel.

---

## Table of Contents

1. [Overview](#overview)
2. [Hardware Setup](#hardware-setup)
3. [Installing Ubuntu Server](#installing-ubuntu-server)
4. [Initial Server Configuration](#initial-server-configuration)
5. [Network Setup Options](#network-setup-options)
6. [Cloudflare Tunnel Setup](#cloudflare-tunnel-setup)
7. [Deploying Your Application](#deploying-your-application)
8. [UPS Configuration](#ups-configuration)
9. [Monitoring Your Home Server](#monitoring-your-home-server)
10. [Backup Strategy for Self-Hosting](#backup-strategy-for-self-hosting)
11. [Troubleshooting](#troubleshooting)
12. [Self-Hosting Maintenance Checklist](#self-hosting-maintenance-checklist)

---

## Overview

### What We're Building

```
Internet Users
      │
      ▼
┌─────────────┐
│ Cloudflare  │  ← Handles SSL, DDoS protection, caching
│   (Free)    │
└─────────────┘
      │
      │ Secure Tunnel (outbound from your home)
      ▼
┌─────────────────────────────────────────┐
│         Your Home Network               │
│  ┌───────────────────────────────────┐  │
│  │     GMKtec G10 Mini PC            │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Ubuntu Server               │  │  │
│  │  │ ├── Cloudflared (tunnel)    │  │  │
│  │  │ ├── Nginx (web server)      │  │  │
│  │  │ ├── FastAPI (backend)       │  │  │
│  │  │ └── SQLite (database)       │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│              │                          │
│         ┌────┴────┐                     │
│         │   UPS   │ ← Battery backup    │
│         └─────────┘                     │
└─────────────────────────────────────────┘
```

### Why Cloudflare Tunnel?

| Problem | Cloudflare Tunnel Solution |
|---------|---------------------------|
| ISP blocks ports 80/443 | Tunnel uses outbound connections (no ports needed) |
| Dynamic home IP | Cloudflare handles DNS automatically |
| Exposing home IP | Your real IP is hidden behind Cloudflare |
| SSL certificates | Cloudflare provides free SSL |
| DDoS attacks | Cloudflare filters malicious traffic |
| Port forwarding complexity | No router configuration needed |

### Cost Summary

| Item | One-Time | Ongoing |
|------|----------|---------|
| GMKtec G10 | $239 | - |
| UPS | $70 | - |
| Ethernet cable | $8 | - |
| Domain name | - | ~$12/year |
| Cloudflare | - | Free |
| Electricity | - | ~$15-25/year |
| **Total** | **$317** | **~$30/year** |

---

## Hardware Setup

### What You Need

- [ ] GMKtec G10 Mini PC
- [ ] USB flash drive (8GB+) for Ubuntu installer
- [ ] Monitor + HDMI cable (temporary, for setup)
- [ ] USB keyboard (temporary, for setup)
- [ ] Ethernet cable (Cat5e or Cat6)
- [ ] UPS (battery backup)

### Physical Setup

1. **Placement**
   - Near your router (for ethernet connection)
   - Good ventilation (don't enclose in cabinet)
   - Away from heat sources
   - Accessible for occasional maintenance

2. **Connections**
   ```
   ┌─────────────────────────────────────┐
   │            GMKtec G10               │
   │                                     │
   │  [Power] ← UPS                      │
   │  [HDMI]  ← Monitor (setup only)     │
   │  [USB]   ← Keyboard (setup only)    │
   │  [ETH]   ← Router (permanent)       │
   └─────────────────────────────────────┘
   ```

3. **UPS Connection**
   - Plug UPS into wall outlet
   - Plug mini PC power adapter into UPS "battery" outlet
   - Connect USB cable from UPS to mini PC (for automatic shutdown)

---

## Installing Ubuntu Server

### Step 1: Download Ubuntu Server

1. Go to https://ubuntu.com/download/server
2. Download **Ubuntu Server 24.04 LTS** (64-bit)
3. You'll get an ISO file (~2GB)

### Step 2: Create Bootable USB Drive

#### On macOS:

```bash
# List disks to find your USB drive
diskutil list

# Identify your USB drive (e.g., /dev/disk4)
# BE CAREFUL - wrong disk will erase your Mac's drive!

# Unmount the USB drive
diskutil unmountDisk /dev/disk4

# Write the ISO (replace disk4 with your disk number)
sudo dd if=~/Downloads/ubuntu-24.04-live-server-amd64.iso of=/dev/rdisk4 bs=1m

# This takes several minutes with no progress indicator
# Wait until you see the command prompt return
```

#### Alternative: Use balenaEtcher (Easier)

1. Download balenaEtcher from https://www.balena.io/etcher/
2. Open balenaEtcher
3. Select the Ubuntu ISO
4. Select your USB drive
5. Click "Flash!"

### Step 3: Install Ubuntu Server

1. **Boot from USB**
   - Insert USB into GMKtec G10
   - Connect monitor and keyboard
   - Power on
   - Press F7 or F12 repeatedly during boot to access boot menu
   - Select your USB drive

2. **Installation Wizard**

   | Screen | Selection |
   |--------|-----------|
   | Language | English |
   | Keyboard | Your keyboard layout |
   | Installation type | Ubuntu Server |
   | Network | Should auto-detect ethernet |
   | Proxy | Leave blank |
   | Mirror | Default (archive.ubuntu.com) |
   | Storage | Use entire disk (default) |
   | Profile setup | See below |
   | SSH | ✅ Install OpenSSH server |
   | Featured snaps | Skip (none needed) |

3. **Profile Setup**
   ```
   Your name: Your Name
   Server name: hr-server
   Username: admin (or your preference)
   Password: [strong password - write it down!]
   ```

4. **Complete Installation**
   - Wait for installation to complete
   - Remove USB drive when prompted
   - Press Enter to reboot

### Step 4: First Boot

After reboot, you'll see a login prompt:

```
hr-server login: admin
Password: [your password]
```

### Step 5: Note the IP Address

```bash
ip addr show
```

Look for something like `192.168.1.xxx` under your ethernet adapter (usually `enp1s0` or `eth0`).

**Write this down** - you'll use it to connect via SSH.

### Step 6: Disconnect Monitor/Keyboard

From now on, you'll connect via SSH from your Mac. You can disconnect the monitor and keyboard.

---

## Initial Server Configuration

### Connect via SSH from Your Mac

```bash
ssh admin@192.168.1.xxx
# Replace with your server's IP address
```

### Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

### Set Up Static IP (Recommended)

A static IP ensures your server always has the same local address.

```bash
# Find your network interface name
ip link show
# Usually "enp1s0" or "eth0"

# Edit netplan configuration
sudo nano /etc/netplan/00-installer-config.yaml
```

Replace contents with (adjust for your network):

```yaml
network:
  version: 2
  ethernets:
    enp1s0:  # Your interface name
      dhcp4: no
      addresses:
        - 192.168.1.100/24  # Choose an IP outside your router's DHCP range
      routes:
        - to: default
          via: 192.168.1.1  # Your router's IP
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Apply the configuration:

```bash
sudo netplan apply
```

**Note:** Your SSH connection may drop. Reconnect using the new IP:

```bash
ssh admin@192.168.1.100
```

### Install Essential Packages

```bash
sudo apt install -y \
    nginx \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    git \
    curl \
    ufw \
    htop \
    apcupsd
```

### Configure Firewall

```bash
# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow HTTP/HTTPS (needed for Cloudflare Tunnel verification)
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Set Timezone

```bash
sudo timedatectl set-timezone America/New_York
# Replace with your timezone: America/Los_Angeles, America/Chicago, etc.

# Verify
timedatectl
```

---

## Network Setup Options

You have two options for making your server accessible from the internet:

### Option A: Cloudflare Tunnel (Recommended)

**Pros:**
- No router configuration needed
- Works even if ISP blocks ports
- Hides your home IP
- Free SSL certificates
- DDoS protection

**Cons:**
- Traffic routes through Cloudflare
- Requires Cloudflare account

**➡️ This guide uses Cloudflare Tunnel. Continue to the next section.**

### Option B: Traditional Port Forwarding

**Pros:**
- Direct connection (slightly lower latency)
- No third-party dependency

**Cons:**
- Requires router configuration
- May not work if ISP blocks ports
- Exposes your home IP
- Need to manage SSL certificates yourself
- Need dynamic DNS if IP changes

**If you want traditional port forwarding instead, see Appendix A at the end of this guide.**

---

## Cloudflare Tunnel Setup

### Step 1: Domain and Cloudflare Account

#### Register a Domain

If you haven't already:
1. Go to https://www.namecheap.com or https://www.cloudflare.com/products/registrar/
2. Search for your domain (e.g., `bifrostin.com`)
3. Purchase (~$10-12/year)

#### Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account

#### Add Your Domain to Cloudflare

1. In Cloudflare dashboard, click "Add a Site"
2. Enter your domain (e.g., `bifrostin.com`)
3. Select **Free** plan
4. Cloudflare will scan existing DNS records
5. Cloudflare will give you nameservers like:
   ```
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```

#### Update Nameservers at Your Registrar

1. Go to your domain registrar (Namecheap, etc.)
2. Find DNS/Nameserver settings
3. Change nameservers to the Cloudflare ones
4. Wait 10-60 minutes for propagation

### Step 2: Create Cloudflare Tunnel

#### In Cloudflare Dashboard:

1. Go to **Zero Trust** (left sidebar) → **Networks** → **Tunnels**
2. Click **Create a tunnel**
3. Select **Cloudflared** as the connector
4. Name your tunnel: `hr-dashboard-tunnel`
5. Click **Save tunnel**

#### You'll see installation instructions. Copy the token (looks like a long random string).

### Step 3: Install Cloudflared on Your Server

SSH into your server and run:

```bash
# Download and install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb

# Verify installation
cloudflared --version
```

### Step 4: Connect the Tunnel

```bash
# Install the tunnel service using your token
sudo cloudflared service install YOUR_TOKEN_HERE

# Replace YOUR_TOKEN_HERE with the token from Cloudflare dashboard
```

Verify it's running:

```bash
sudo systemctl status cloudflared
```

You should see `active (running)`.

### Step 5: Configure Tunnel Routes

Back in Cloudflare Dashboard:

1. Go to **Zero Trust** → **Networks** → **Tunnels**
2. Click on your tunnel (`hr-dashboard-tunnel`)
3. Go to **Public Hostname** tab
4. Add routes:

#### Route 1: HR Hub

| Field | Value |
|-------|-------|
| Subdomain | `hr` |
| Domain | `bifrostin.com` |
| Type | `HTTP` |
| URL | `localhost:80` |

Click **Save hostname**

#### Route 2: Employee Portal

| Field | Value |
|-------|-------|
| Subdomain | `portal` |
| Domain | `bifrostin.com` |
| Type | `HTTP` |
| URL | `localhost:80` |

Click **Save hostname**

### Step 6: Configure SSL Settings

1. In Cloudflare Dashboard, go to your domain
2. Go to **SSL/TLS** → **Overview**
3. Set SSL mode to **Full**

### Step 7: Verify Tunnel is Working

In Cloudflare Dashboard under Tunnels, your tunnel should show as **HEALTHY**.

At this point:
- `https://hr.bifrostin.com` → Will reach your server (but show Nginx default page)
- `https://portal.bifrostin.com` → Will reach your server

---

## Deploying Your Application

### Step 1: Create Directory Structure

```bash
sudo mkdir -p /var/www/hr-dashboard/{backend,frontend,employee-portal}
sudo mkdir -p /var/www/hr-dashboard/backend/data
sudo mkdir -p /var/log/hr-dashboard
sudo mkdir -p /var/backups/hr-dashboard
sudo chown -R $USER:$USER /var/www/hr-dashboard
```

### Step 2: Upload Application Files

#### On Your Mac:

First, build the frontend applications:

```bash
cd /Users/michaelknudson/Desktop/hr-dashboard

# Build HR Hub
cd frontend
npm ci
npm run build
cd ..

# Build Employee Portal
cd employee-portal
npm ci
npm run build
cd ..
```

Then upload to your server:

```bash
# Upload everything (from hr-dashboard directory)
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='venv' \
  --exclude='__pycache__' \
  ./ admin@192.168.1.100:/var/www/hr-dashboard/
```

### Step 3: Set Up Backend

SSH into your server:

```bash
ssh admin@192.168.1.100
```

Set up Python environment:

```bash
cd /var/www/hr-dashboard/backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn[standard]

# Deactivate
deactivate
```

### Step 4: Create Production Environment File

```bash
nano /var/www/hr-dashboard/backend/.env.production
```

Add the following (generate your own keys!):

```bash
# Generate keys with: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-generated-secret-key-here
FIELD_ENCRYPTION_KEY=your-generated-encryption-key-here

# Database
DATABASE_URL=sqlite:///./data/hr_dashboard.db

# Environment
ENVIRONMENT=production
DEBUG=false

# Domain settings
DOMAIN=bifrostin.com
HR_HUB_URL=https://hr.bifrostin.com
PORTAL_URL=https://portal.bifrostin.com
CORS_ORIGINS=https://hr.bifrostin.com,https://portal.bifrostin.com
```

Secure the file:

```bash
chmod 600 /var/www/hr-dashboard/backend/.env.production
```

### Step 5: Configure Nginx

Create the Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/hr-dashboard
```

Paste the following:

```nginx
# HR Hub
server {
    listen 80;
    server_name hr.bifrostin.com;

    root /var/www/hr-dashboard/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location ~ ^/(auth|fmla|employees|analytics|notifications|garnishments|turnover|events|event-types|projects|timesheets|time-entries|compensation|market-data|performance|onboarding|offboarding|equipment|contribution-limits|pto|users|admin|aca|eeo|settings|emails|file-uploads|sftp|payroll|capitalized-labor|reports)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth endpoint (no trailing slash)
    location /auth {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Employee Portal
server {
    listen 80;
    server_name portal.bifrostin.com;

    root /var/www/hr-dashboard/employee-portal/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location ~ ^/(auth|portal|fmla|employees)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hr-dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Create Systemd Service

```bash
sudo nano /etc/systemd/system/hr-dashboard.service
```

Paste:

```ini
[Unit]
Description=HR Dashboard FastAPI Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/hr-dashboard/backend
Environment="PATH=/var/www/hr-dashboard/backend/venv/bin"
EnvironmentFile=/var/www/hr-dashboard/backend/.env.production
ExecStart=/var/www/hr-dashboard/backend/venv/bin/gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/hr-dashboard/access.log \
    --error-logfile /var/log/hr-dashboard/error.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Step 7: Set Permissions and Start Services

```bash
# Set ownership
sudo chown -R www-data:www-data /var/www/hr-dashboard
sudo chown -R www-data:www-data /var/log/hr-dashboard

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the backend
sudo systemctl enable hr-dashboard
sudo systemctl start hr-dashboard

# Check status
sudo systemctl status hr-dashboard
```

### Step 8: Test Your Deployment

Visit in your browser:
- https://hr.bifrostin.com
- https://portal.bifrostin.com

You should see your applications!

---

## UPS Configuration

### Why UPS Matters for Self-Hosting

| Without UPS | With UPS |
|-------------|----------|
| Power flicker → Database corruption | Power flicker → Keeps running |
| Power outage → Immediate shutdown | Power outage → Clean shutdown |
| Power surge → Hardware damage | Power surge → Protected |

### Install UPS Software

We'll use `apcupsd` for APC UPS units (or `nut` for other brands).

```bash
# Already installed earlier, but just in case:
sudo apt install -y apcupsd
```

### Configure apcupsd

```bash
sudo nano /etc/apcupsd/apcupsd.conf
```

Find and modify these lines:

```
UPSCABLE usb
UPSTYPE usb
DEVICE
POLLTIME 60
ONBATTERYDELAY 6
BATTERYLEVEL 10
MINUTES 5
TIMEOUT 0
```

**Key settings:**
- `BATTERYLEVEL 10` = Shutdown when 10% battery remains
- `MINUTES 5` = Shutdown when 5 minutes runtime remains

### Enable apcupsd

```bash
# Edit default file
sudo nano /etc/default/apcupsd

# Change this line:
ISCONFIGURED=yes
```

Start the service:

```bash
sudo systemctl enable apcupsd
sudo systemctl start apcupsd
```

### Test UPS Status

```bash
apcaccess status
```

You should see:

```
STATUS    : ONLINE
LINEV     : 120.0 Volts
LOADPCT   : 15.0 Percent
BCHARGE   : 100.0 Percent
TIMELEFT  : 30.0 Minutes
```

### Test Shutdown (Optional)

To verify automatic shutdown works:

```bash
# Simulate power failure (just tests the script, doesn't actually shut down)
sudo apctest
```

---

## Monitoring Your Home Server

### Local Network Access

From any device on your home network, you can:

```bash
# Check if server is up (from your Mac)
ping 192.168.1.100

# SSH in
ssh admin@192.168.1.100
```

### UptimeRobot (Free External Monitoring)

1. Go to https://uptimerobot.com
2. Create free account
3. Add monitors:
   - `https://hr.bifrostin.com`
   - `https://portal.bifrostin.com`
4. Set up email/SMS alerts

UptimeRobot will notify you if your sites go down (internet outage, power outage, server crash, etc.).

### Healthchecks.io (For Scheduled Jobs)

Monitor that your backups are running:

1. Go to https://healthchecks.io
2. Create a check, get URL: `https://hc-ping.com/your-uuid`
3. Add to the end of your backup script:
   ```bash
   curl -fsS -m 10 --retry 5 https://hc-ping.com/your-uuid
   ```

### Server Dashboard (Optional)

For a nice visual dashboard, consider installing **Netdata**:

```bash
# Install Netdata
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh
sh /tmp/netdata-kickstart.sh --stable-channel
```

Access at `http://192.168.1.100:19999` (local network only).

---

## Backup Strategy for Self-Hosting

### Local Backups

Create the backup script:

```bash
sudo nano /usr/local/bin/backup-hr-dashboard.sh
```

```bash
#!/bin/bash
# HR Dashboard Backup Script for Self-Hosting

BACKUP_DIR="/var/backups/hr-dashboard"
DATA_DIR="/var/www/hr-dashboard/backend/data"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "$DATA_DIR/hr_dashboard.db" ]; then
    cp "$DATA_DIR/hr_dashboard.db" "$BACKUP_DIR/hr_dashboard_$DATE.db"
    echo "Database backed up: hr_dashboard_$DATE.db"
fi

# Clean old backups
find $BACKUP_DIR -name "*.db" -mtime +$RETENTION_DAYS -delete
echo "Cleaned backups older than $RETENTION_DAYS days"

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR | tail -5
```

Make it executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-hr-dashboard.sh

# Add to crontab
sudo crontab -e

# Add this line (runs at 2 AM daily):
0 2 * * * /usr/local/bin/backup-hr-dashboard.sh >> /var/log/hr-dashboard/backup.log 2>&1
```

### Offsite Backups (Important!)

Local backups protect against data corruption and accidental deletion, but NOT against:
- Theft
- Fire
- Flood
- Ransomware

**Option 1: Cloud Sync (Easiest)**

Sync backups to cloud storage:

```bash
# Install rclone
sudo apt install rclone

# Configure (follow prompts for Google Drive, Dropbox, etc.)
rclone config

# Add to backup script:
rclone copy /var/backups/hr-dashboard remote:hr-dashboard-backups --max-age 7d
```

**Option 2: Manual Download**

Periodically download backups to your Mac:

```bash
# From your Mac
scp admin@192.168.1.100:/var/backups/hr-dashboard/latest.db ~/Desktop/
```

**Option 3: External Drive**

Keep an external drive that you:
1. Plug in weekly
2. Copy backups to it
3. Store offsite (office, relative's house, safety deposit box)

---

## Troubleshooting

### Site Not Loading

**Check Cloudflare Tunnel:**
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 50
```

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

**Check Backend:**
```bash
sudo systemctl status hr-dashboard
sudo journalctl -u hr-dashboard -n 50
```

### "502 Bad Gateway"

Backend isn't responding:
```bash
# Restart backend
sudo systemctl restart hr-dashboard

# Check logs
sudo journalctl -u hr-dashboard -n 100
```

### Internet Outage at Home

Unfortunately, if your home internet goes down, your sites go down. This is the main trade-off of self-hosting.

**Mitigations:**
- UptimeRobot alerts you immediately
- Consider cellular backup (expensive)
- Accept occasional downtime for internal tools

### Power Outage

With UPS:
- Brief outage: Server keeps running
- Extended outage: Server shuts down cleanly, starts when power returns

**Enable auto-start on boot:**
```bash
sudo systemctl is-enabled hr-dashboard  # Should say "enabled"
sudo systemctl is-enabled nginx         # Should say "enabled"
sudo systemctl is-enabled cloudflared   # Should say "enabled"
```

### Server Won't Boot

1. Connect monitor and keyboard
2. Check for error messages
3. Common issues:
   - Disk failure (check `dmesg` output)
   - RAM issues (BIOS may show errors)
   - Power supply failure

### Cloudflare Tunnel Disconnects

```bash
# Check status
sudo systemctl status cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# Check logs
sudo journalctl -u cloudflared -n 100
```

### Database Corruption

Restore from backup:

```bash
sudo systemctl stop hr-dashboard

# Find latest backup
ls -la /var/backups/hr-dashboard/

# Restore
sudo cp /var/backups/hr-dashboard/hr_dashboard_YYYYMMDD_HHMMSS.db \
        /var/www/hr-dashboard/backend/data/hr_dashboard.db

sudo chown www-data:www-data /var/www/hr-dashboard/backend/data/hr_dashboard.db
sudo systemctl start hr-dashboard
```

---

## Self-Hosting Maintenance Checklist

### Weekly (5 minutes)

```
□ Check sites load: https://hr.bifrostin.com, https://portal.bifrostin.com
□ Check UptimeRobot for any alerts
□ Glance at UPS status: apcaccess status
```

### Monthly (15 minutes)

```
□ SSH into server
□ Run updates: sudo apt update && sudo apt upgrade -y
□ Check disk space: df -h
□ Verify backups: ls -la /var/backups/hr-dashboard/ | tail -5
□ Check services: sudo systemctl status hr-dashboard nginx cloudflared
□ Check UPS battery: apcaccess status (look at BCHARGE)
□ Review tunnel status in Cloudflare dashboard
```

### Quarterly (30 minutes)

```
□ Test restore from backup
□ Download backup copy to Mac
□ Test UPS by unplugging briefly (optional)
□ Check for Ubuntu LTS updates: do-release-upgrade -c
□ Review Cloudflare analytics for unusual traffic
```

### Yearly

```
□ Review and update passwords
□ Check UPS battery health (replace every 3-5 years)
□ Clean dust from mini PC vents
□ Review if self-hosting still makes sense vs VPS
```

---

## Appendix A: Traditional Port Forwarding (Alternative to Cloudflare)

If you prefer direct connections without Cloudflare:

### 1. Set Up Dynamic DNS

Using DuckDNS (free):

1. Go to https://www.duckdns.org
2. Sign in with Google/GitHub
3. Create a subdomain: `bifrostin.duckdns.org`
4. Note your token

Install updater:

```bash
mkdir ~/duckdns
nano ~/duckdns/duck.sh
```

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=bifrostin&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod +x ~/duckdns/duck.sh
crontab -e
# Add: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

### 2. Configure Router Port Forwarding

Access your router (usually http://192.168.1.1):

| External Port | Internal Port | Internal IP | Protocol |
|--------------|---------------|-------------|----------|
| 80 | 80 | 192.168.1.100 | TCP |
| 443 | 443 | 192.168.1.100 | TCP |

### 3. Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d hr.bifrostin.com -d portal.bifrostin.com
```

### 4. Point Domain to DuckDNS

In your domain's DNS, add CNAME records:

```
hr      CNAME   bifrostin.duckdns.org
portal  CNAME   bifrostin.duckdns.org
```

---

## Quick Reference

### Important Paths

| Path | Purpose |
|------|---------|
| `/var/www/hr-dashboard/` | Application files |
| `/var/www/hr-dashboard/backend/data/hr_dashboard.db` | Database |
| `/var/www/hr-dashboard/backend/.env.production` | Secrets |
| `/var/log/hr-dashboard/` | Application logs |
| `/var/backups/hr-dashboard/` | Backups |
| `/etc/nginx/sites-available/hr-dashboard` | Nginx config |
| `/etc/systemd/system/hr-dashboard.service` | Service config |

### Important Commands

```bash
# Service management
sudo systemctl status hr-dashboard nginx cloudflared
sudo systemctl restart hr-dashboard

# Logs
sudo journalctl -u hr-dashboard -f
sudo tail -f /var/log/nginx/error.log

# Disk space
df -h

# UPS status
apcaccess status

# Tunnel status
sudo systemctl status cloudflared
```

### Support Resources

- **Ubuntu:** https://help.ubuntu.com
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Nginx:** https://nginx.org/en/docs/
- **UptimeRobot:** https://uptimerobot.com

---

*Last updated: January 2026*
*For HR Dashboard self-hosted on GMKtec G10*
