# Server Maintenance Guide for Beginners

A comprehensive guide to maintaining your HR Dashboard server on Hetzner. Written for those new to server administration.

---

## Table of Contents

1. [Understanding Your Server](#understanding-your-server)
2. [Connecting to Your Server](#connecting-to-your-server)
3. [Essential Commands Reference](#essential-commands-reference)
4. [Maintenance Tasks Explained](#maintenance-tasks-explained)
5. [Setting Up Automation](#setting-up-automation)
6. [Monitoring Your Server](#monitoring-your-server)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [Security Best Practices](#security-best-practices)
9. [Monthly Maintenance Checklist](#monthly-maintenance-checklist)
10. [Glossary](#glossary)

---

## Understanding Your Server

### What Is a VPS?

A Virtual Private Server (VPS) is like renting a computer in a data center. You don't physically touch it, but you control it completely through the internet.

```
Your Mac                         Hetzner Data Center
┌─────────┐                      ┌─────────────────┐
│         │   SSH Connection     │  Your VPS       │
│  You    │ ──────────────────── │  ┌───────────┐  │
│         │   (encrypted)        │  │ Ubuntu OS │  │
└─────────┘                      │  │ Nginx     │  │
                                 │  │ Your App  │  │
                                 │  └───────────┘  │
                                 └─────────────────┘
```

### What's Running on Your Server

| Component | What It Does | Port |
|-----------|--------------|------|
| **Ubuntu** | Operating system (like macOS but for servers) | - |
| **Nginx** | Web server - receives requests, serves your sites | 80, 443 |
| **FastAPI** | Your backend application | 8000 |
| **SQLite** | Database storing all your data | - |
| **Certbot** | Manages SSL certificates (HTTPS) | - |
| **systemd** | Keeps your app running, restarts if it crashes | - |

### Important File Locations

```
/var/www/hr-dashboard/          # Your application
├── backend/                    # Python backend
│   ├── app/                    # Application code
│   ├── data/                   # Database lives here
│   │   └── hr_dashboard.db     # ← YOUR DATA
│   ├── venv/                   # Python dependencies
│   └── .env.production         # Secret configuration
├── frontend/                   # HR Hub files
├── employee-portal/            # Employee Portal files
└── deployment/                 # Scripts and configs

/etc/nginx/                     # Nginx configuration
├── sites-available/            # Available site configs
└── sites-enabled/              # Active site configs

/var/log/                       # System logs
├── nginx/                      # Web server logs
├── hr-dashboard/               # Your app logs
└── auth.log                    # Login attempts

/var/backups/hr-dashboard/      # Your backups
```

---

## Connecting to Your Server

### Using SSH (Secure Shell)

SSH is how you remotely control your server. It's like opening Terminal, but on your server instead of your Mac.

#### Basic Connection

```bash
# From your Mac's Terminal:
ssh root@hr.bifrostin.com

# Or using IP address:
ssh root@123.45.67.89
```

You'll see something like:
```
Welcome to Ubuntu 24.04 LTS

Last login: Fri Jan 23 10:30:00 2026 from 98.76.54.32
root@hr-dashboard:~#
```

The `root@hr-dashboard:~#` is your **prompt**. It means:
- `root` = You're logged in as the root (admin) user
- `hr-dashboard` = Server's hostname
- `~` = You're in the home directory
- `#` = You have admin privileges

#### Disconnecting

```bash
# Type 'exit' or press Ctrl+D
exit
```

#### If Connection Fails

| Error | Meaning | Solution |
|-------|---------|----------|
| "Connection refused" | SSH isn't running or firewall blocking | Check Hetzner console |
| "Connection timed out" | Wrong IP or server is down | Verify IP address |
| "Permission denied" | Wrong password or SSH key | Check credentials |

### Setting Up SSH Keys (More Secure, No Password)

SSH keys let you log in without typing a password every time.

#### Step 1: Generate a Key (On Your Mac)

```bash
# Run this on your Mac, not the server
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Press Enter for default location. Optionally add a passphrase.

#### Step 2: Copy Key to Server

```bash
# This copies your public key to the server
ssh-copy-id root@hr.bifrostin.com
```

#### Step 3: Test It

```bash
# Should log in without asking for password
ssh root@hr.bifrostin.com
```

---

## Essential Commands Reference

### Navigation

```bash
# Where am I?
pwd
# Output: /var/www/hr-dashboard

# List files in current directory
ls

# List with details (permissions, size, date)
ls -la

# Change directory
cd /var/www/hr-dashboard

# Go up one directory
cd ..

# Go to home directory
cd ~
```

### Viewing Files

```bash
# View entire file
cat filename.txt

# View file with scrolling (press 'q' to quit)
less filename.txt

# View first 20 lines
head -20 filename.txt

# View last 20 lines
tail -20 filename.txt

# Watch file in real-time (great for logs)
tail -f /var/log/hr-dashboard/error.log
# Press Ctrl+C to stop watching
```

### Editing Files

```bash
# Edit with nano (beginner-friendly)
nano /path/to/file

# Inside nano:
# - Ctrl+O = Save
# - Ctrl+X = Exit
# - Ctrl+W = Search
```

### System Information

```bash
# Disk space usage
df -h

# Memory usage
free -h

# CPU and memory by process
top
# Press 'q' to quit

# Server uptime
uptime

# Current date/time
date
```

### Service Management

```bash
# Check if a service is running
sudo systemctl status hr-dashboard
sudo systemctl status nginx

# Start a service
sudo systemctl start hr-dashboard

# Stop a service
sudo systemctl stop hr-dashboard

# Restart a service
sudo systemctl restart hr-dashboard

# Enable service to start on boot
sudo systemctl enable hr-dashboard

# View service logs
sudo journalctl -u hr-dashboard

# View recent logs (last 50 lines)
sudo journalctl -u hr-dashboard -n 50

# Follow logs in real-time
sudo journalctl -u hr-dashboard -f
# Press Ctrl+C to stop
```

### Package Management (Installing/Updating Software)

```bash
# Update list of available packages
sudo apt update

# Upgrade installed packages
sudo apt upgrade

# Do both
sudo apt update && sudo apt upgrade -y

# Install a package
sudo apt install package-name

# Remove a package
sudo apt remove package-name

# Search for a package
apt search keyword
```

---

## Maintenance Tasks Explained

### Task 1: Security Updates

#### Why It Matters

Software has bugs. Some bugs are security vulnerabilities that hackers exploit. Updates fix these vulnerabilities.

```
Timeline of a vulnerability:
1. Bug discovered in software
2. Fix developed and released as update
3. Hackers learn about the bug
4. Hackers scan for unpatched servers  ← Your server is vulnerable here
5. You apply update                     ← Now you're safe
```

#### How to Apply Updates Manually

```bash
# Step 1: Connect to server
ssh root@hr.bifrostin.com

# Step 2: Update package lists
sudo apt update

# You'll see output like:
# Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease
# Get:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]
# ...
# Reading package lists... Done

# Step 3: See what will be upgraded (optional)
apt list --upgradable

# Step 4: Apply upgrades
sudo apt upgrade -y

# The -y flag automatically answers "yes" to prompts
```

#### Understanding the Output

```
The following packages will be upgraded:
  libssl3 openssl nginx-common
3 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.

# This means:
# - 3 packages have updates
# - None are being newly installed
# - None are being removed
# - After this, everything will be current
```

#### When Reboot Is Required

Sometimes kernel updates require a restart:

```bash
# Check if reboot is needed
cat /var/run/reboot-required 2>/dev/null && echo "Reboot required" || echo "No reboot needed"

# If reboot is required:
sudo reboot

# Wait 1-2 minutes, then reconnect:
ssh root@hr.bifrostin.com
```

#### Frequency

| Update Type | Frequency | Urgency |
|-------------|-----------|---------|
| Regular security updates | Monthly | Normal |
| Critical vulnerabilities | Immediately | High |
| Kernel updates | Monthly | Normal (requires reboot) |

---

### Task 2: Checking Services

#### Why It Matters

Services can crash. If your backend crashes and doesn't restart, your site shows errors but you won't know unless you check.

#### How to Check

```bash
# Check your application
sudo systemctl status hr-dashboard
```

**Healthy output:**
```
● hr-dashboard.service - HR Dashboard FastAPI Backend
     Loaded: loaded (/etc/systemd/system/hr-dashboard.service; enabled)
     Active: active (running) since Mon 2026-01-20 10:00:00 UTC; 3 days ago
   Main PID: 1234 (gunicorn)
      Tasks: 3 (limit: 4915)
     Memory: 120.5M
        CPU: 5min 30s
```

Key things to look for:
- `Active: active (running)` ✅ Good
- `Active: failed` ❌ Problem - needs investigation
- `Active: inactive (dead)` ⚠️ Not running - needs to be started

**If service is not running:**
```bash
# Try to start it
sudo systemctl start hr-dashboard

# Check status again
sudo systemctl status hr-dashboard

# If it keeps failing, check logs
sudo journalctl -u hr-dashboard -n 100
```

#### Check Nginx

```bash
sudo systemctl status nginx
```

Should show `active (running)`.

#### Quick Health Check Script

Save yourself time with a quick check:

```bash
# One-liner to check both services
systemctl is-active hr-dashboard nginx
```

Output should be:
```
active
active
```

---

### Task 3: Monitoring Disk Space

#### Why It Matters

When a disk fills up:
- Database can't write new data
- Logs can't be written
- Services crash
- Your site goes down

#### How to Check

```bash
df -h
```

**Output explained:**
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        40G   12G   26G  32% /
```

| Column | Meaning |
|--------|---------|
| Size | Total disk space (40 GB) |
| Used | Space used (12 GB) |
| Avail | Space available (26 GB) |
| Use% | Percentage used (32%) |
| Mounted on | `/` means the main disk |

**Warning levels:**
- Below 70%: ✅ Healthy
- 70-85%: ⚠️ Getting full, investigate
- Above 85%: 🚨 Clean up soon
- Above 95%: 🔥 Critical, clean immediately

#### What Uses Disk Space?

```bash
# Find largest directories
sudo du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10
```

Common space consumers:
- `/var/log/` - Log files (can be cleaned)
- `/var/www/hr-dashboard/backend/data/` - Your database (don't delete!)
- `/var/backups/` - Backups (keep recent ones)

#### Cleaning Up Disk Space

```bash
# Clean old system logs (keeps last 7 days)
sudo journalctl --vacuum-time=7d

# Clean apt cache
sudo apt clean

# Remove old packages no longer needed
sudo apt autoremove -y

# Check log file sizes
sudo du -h /var/log/ | sort -hr | head -10
```

---

### Task 4: Managing Backups

#### Why Backups Matter

Backups protect against:
- Accidental data deletion
- Database corruption
- Ransomware/hacking
- Failed updates
- Hardware failure

#### Your Backup Strategy

The backup script creates daily copies of:
- Your SQLite database
- Any uploaded files

Backups are kept for 30 days, then automatically deleted.

#### Checking Backups

```bash
# List recent backups
ls -la /var/backups/hr-dashboard/ | tail -10
```

**Good output:**
```
-rw-r--r-- 1 root root 2.5M Jan 23 02:00 hr_dashboard_20260123_020001.db
-rw-r--r-- 1 root root 2.5M Jan 22 02:00 hr_dashboard_20260122_020001.db
-rw-r--r-- 1 root root 2.5M Jan 21 02:00 hr_dashboard_20260121_020001.db
```

**Warning signs:**
- No recent files (backup job not running)
- Files with 0 size (backup failed)
- Missing days (job skipped)

#### Running Backup Manually

```bash
sudo bash /var/www/hr-dashboard/deployment/backup.sh
```

#### Restoring from Backup

If something goes wrong and you need to restore:

```bash
# Stop the application
sudo systemctl stop hr-dashboard

# Copy backup over current database
sudo cp /var/backups/hr-dashboard/hr_dashboard_20260123_020001.db \
        /var/www/hr-dashboard/backend/data/hr_dashboard.db

# Fix permissions
sudo chown www-data:www-data /var/www/hr-dashboard/backend/data/hr_dashboard.db

# Start the application
sudo systemctl start hr-dashboard
```

#### Downloading Backups to Your Mac

For extra safety, periodically download backups:

```bash
# Run this from your Mac
scp root@hr.bifrostin.com:/var/backups/hr-dashboard/hr_dashboard_20260123_020001.db ~/Desktop/
```

---

### Task 5: Reviewing Logs

#### Why Review Logs?

Logs tell you:
- What's happening on your server
- Why something failed
- If someone is trying to break in
- Performance issues

#### Application Logs

```bash
# View recent application logs
sudo journalctl -u hr-dashboard -n 50

# View logs from today
sudo journalctl -u hr-dashboard --since today

# View logs from last hour
sudo journalctl -u hr-dashboard --since "1 hour ago"

# Search for errors
sudo journalctl -u hr-dashboard | grep -i error

# Follow logs in real-time (useful when debugging)
sudo journalctl -u hr-dashboard -f
```

#### Nginx Access Logs (Who's Visiting)

```bash
# View recent web requests
sudo tail -50 /var/log/nginx/access.log
```

**Sample line:**
```
192.168.1.100 - - [23/Jan/2026:10:30:00 +0000] "GET /fmla/dashboard HTTP/1.1" 200 1234
```

| Part | Meaning |
|------|---------|
| 192.168.1.100 | Visitor's IP address |
| [23/Jan/2026:10:30:00] | Date and time |
| "GET /fmla/dashboard" | What they requested |
| 200 | Status code (200 = success) |

#### Nginx Error Logs

```bash
# View web server errors
sudo tail -50 /var/log/nginx/error.log
```

#### Security Logs (Login Attempts)

```bash
# See failed SSH login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# See successful logins
sudo grep "Accepted" /var/log/auth.log | tail -20
```

**Lots of failed attempts from random IPs is normal** - bots constantly scan the internet. This is why we:
1. Use SSH keys instead of passwords
2. Keep the system updated
3. Use a firewall

---

### Task 6: SSL Certificate Management

#### What SSL Certificates Do

SSL certificates enable HTTPS, which:
- Encrypts data between users and your server
- Shows the padlock icon in browsers
- Is required for secure cookies (your login system)

#### How Certbot Works

Let's Encrypt provides free certificates that expire every 90 days. Certbot automatically renews them.

#### Checking Certificate Status

```bash
sudo certbot certificates
```

**Output:**
```
Certificate Name: hr.bifrostin.com
    Domains: hr.bifrostin.com
    Expiry Date: 2026-04-23 (VALID: 89 days)
    Certificate Path: /etc/letsencrypt/live/hr.bifrostin.com/fullchain.pem
```

If expiry is less than 30 days and hasn't auto-renewed, something's wrong.

#### Manual Renewal (If Needed)

```bash
# Test renewal without actually doing it
sudo certbot renew --dry-run

# Actually renew
sudo certbot renew
```

#### Automatic Renewal

Certbot installs a timer that runs twice daily. Check it's active:

```bash
sudo systemctl status certbot.timer
```

Should show `active (waiting)`.

---

## Setting Up Automation

After your initial deployment, run this script to automate most maintenance:

```bash
sudo bash /var/www/hr-dashboard/deployment/setup-automation.sh
```

### What Gets Automated

#### 1. Automatic Security Updates

The `unattended-upgrades` package automatically installs security patches.

**Configuration:** `/etc/apt/apt.conf.d/50unattended-upgrades`

```bash
# Check if it's working
sudo unattended-upgrades --dry-run -v
```

**Behavior:**
- Checks for updates daily
- Installs security updates automatically
- Reboots at 3 AM if kernel update requires it
- Logs to `/var/log/unattended-upgrades/`

#### 2. Log Rotation

Prevents log files from filling your disk.

**Configuration:** `/etc/logrotate.d/hr-dashboard`

**Behavior:**
- Rotates logs daily
- Keeps 14 days of logs
- Compresses old logs to save space

#### 3. Scheduled Backups

**Cron job** runs backup script at 2 AM daily.

```bash
# View scheduled tasks
sudo crontab -l
```

**Should include:**
```
0 2 * * * /var/www/hr-dashboard/deployment/backup.sh >> /var/log/hr-dashboard/backup.log 2>&1
```

This means: "At minute 0 of hour 2 (2:00 AM), every day, run the backup script"

#### 4. Disk Space Monitoring

**Cron job** checks disk space at 8 AM daily.

Logs warnings to `/var/log/hr-dashboard/disk-alert.log` if disk usage exceeds 80%.

---

## Monitoring Your Server

### Option 1: UptimeRobot (Free, Recommended)

UptimeRobot checks if your site is online every 5 minutes and emails you if it goes down.

#### Setup:

1. Go to https://uptimerobot.com
2. Create free account
3. Add monitors:
   - **HR Hub**: `https://hr.bifrostin.com`
   - **Employee Portal**: `https://portal.bifrostin.com`
4. Set alert contacts (your email, phone)

**What it monitors:**
- Site is reachable
- Returns HTTP 200 (success)
- Response time

### Option 2: Healthchecks.io (Free, For Scheduled Jobs)

Monitors that your backup job runs successfully.

#### Setup:

1. Go to https://healthchecks.io
2. Create free account
3. Create a check, get a URL like: `https://hc-ping.com/abc123`
4. Add to your backup script:

```bash
# At end of backup.sh, add:
curl -fsS -m 10 --retry 5 https://hc-ping.com/abc123
```

Now you'll be alerted if backups stop running.

### Option 3: Server-Side Monitoring

Check server resources with `htop`:

```bash
# Install htop (nicer than top)
sudo apt install htop

# Run it
htop
```

**What to look for:**
- CPU bars mostly green (good) vs red (overloaded)
- Memory usage (your app needs ~200MB)
- Load average (should be below number of CPUs)

Press `q` to quit.

---

## Troubleshooting Common Issues

### Issue: Site Shows "502 Bad Gateway"

**Meaning:** Nginx is running, but can't reach your backend.

**Solution:**

```bash
# Check if backend is running
sudo systemctl status hr-dashboard

# If not running, start it
sudo systemctl start hr-dashboard

# If it won't start, check logs
sudo journalctl -u hr-dashboard -n 100

# Common causes:
# - Python error in your code
# - Missing environment variable
# - Port 8000 already in use
```

### Issue: Site Shows "Connection Refused"

**Meaning:** Nothing is listening on port 80/443.

**Solution:**

```bash
# Check Nginx
sudo systemctl status nginx

# If not running
sudo systemctl start nginx

# If it fails, check configuration
sudo nginx -t

# This will show syntax errors in config
```

### Issue: "Permission Denied" Errors in Logs

**Meaning:** File permissions are wrong.

**Solution:**

```bash
# Fix ownership of application files
sudo chown -R www-data:www-data /var/www/hr-dashboard

# Fix permissions
sudo chmod -R 755 /var/www/hr-dashboard
sudo chmod 600 /var/www/hr-dashboard/backend/.env.production
```

### Issue: Database Errors

**Meaning:** SQLite file is corrupted or inaccessible.

**Solution:**

```bash
# Check database file exists
ls -la /var/www/hr-dashboard/backend/data/

# Check permissions
# Should be owned by www-data
sudo chown www-data:www-data /var/www/hr-dashboard/backend/data/hr_dashboard.db

# If corrupted, restore from backup
sudo systemctl stop hr-dashboard
sudo cp /var/backups/hr-dashboard/LATEST_BACKUP.db \
        /var/www/hr-dashboard/backend/data/hr_dashboard.db
sudo chown www-data:www-data /var/www/hr-dashboard/backend/data/hr_dashboard.db
sudo systemctl start hr-dashboard
```

### Issue: SSL Certificate Errors

**Meaning:** Certificate expired or misconfigured.

**Solution:**

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Restart nginx to load new cert
sudo systemctl restart nginx
```

### Issue: Server Is Slow

**Possible causes:**

```bash
# Check CPU and memory
htop

# Check disk I/O
iostat -x 1 5

# Check what's using resources
ps aux --sort=-%mem | head -10
ps aux --sort=-%cpu | head -10
```

### Issue: Can't SSH Into Server

**From Hetzner Console:**

1. Log into Hetzner Cloud Console
2. Select your server
3. Click "Console" button (top right)
4. This gives you direct access even if SSH is broken

**Common fixes:**
```bash
# Check SSH service
sudo systemctl status sshd

# Restart SSH
sudo systemctl restart sshd

# Check firewall isn't blocking
sudo ufw status
# Should show 22/tcp ALLOW
```

---

## Security Best Practices

### 1. Keep System Updated

Already covered - use automatic updates.

### 2. Use SSH Keys, Disable Password Login

After setting up SSH keys:

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Find and change these lines:
PasswordAuthentication no
PermitRootLogin prohibit-password

# Restart SSH
sudo systemctl restart sshd
```

**⚠️ Warning:** Make sure your SSH key works before doing this!

### 3. Firewall Configuration

Your server should only expose necessary ports:

```bash
# Check firewall status
sudo ufw status

# Should show:
# 22/tcp    ALLOW    (SSH)
# 80/tcp    ALLOW    (HTTP)
# 443/tcp   ALLOW    (HTTPS)
```

### 4. Fail2ban (Optional Extra Security)

Blocks IPs that have too many failed login attempts:

```bash
# Install
sudo apt install fail2ban

# Start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check banned IPs
sudo fail2ban-client status sshd
```

### 5. Regular Backups

Already configured - just verify they're running.

### 6. Strong Application Passwords

- Change default admin password immediately
- Use unique passwords for each user
- Consider implementing password requirements

---

## Monthly Maintenance Checklist

Print this and check off each month:

```
□ Week 1: Updates and Services
  □ SSH into server
  □ Run: sudo apt update && sudo apt upgrade -y
  □ Check for reboot requirement
  □ Verify hr-dashboard service: sudo systemctl status hr-dashboard
  □ Verify nginx service: sudo systemctl status nginx

□ Week 2: Storage and Backups
  □ Check disk space: df -h (should be <80%)
  □ Verify backups exist: ls -la /var/backups/hr-dashboard/ | tail -5
  □ Download one backup to your Mac (monthly)

□ Week 3: Security Review
  □ Check SSL certificates: sudo certbot certificates
  □ Review failed login attempts: sudo grep "Failed" /var/log/auth.log | wc -l
  □ Check for unusual processes: htop

□ Week 4: Logs and Performance
  □ Review application errors: sudo journalctl -u hr-dashboard | grep -i error
  □ Check nginx errors: sudo tail -50 /var/log/nginx/error.log
  □ Verify site loads quickly in browser

□ Any Time: After Incidents
  □ Document what happened
  □ Document how you fixed it
  □ Consider if automation could prevent it
```

---

## Glossary

| Term | Definition |
|------|------------|
| **SSH** | Secure Shell - encrypted way to remotely access your server |
| **Root** | The administrator account with full privileges |
| **sudo** | "Super User Do" - runs a command with admin privileges |
| **systemd** | The system that manages services (starting, stopping, restarting) |
| **Nginx** | Web server software that handles incoming requests |
| **SSL/TLS** | Encryption that makes HTTPS secure |
| **Certificate** | Digital proof that your site is who it claims to be |
| **Firewall** | Software that blocks unauthorized network connections |
| **Port** | A numbered endpoint for network communication (80=HTTP, 443=HTTPS, 22=SSH) |
| **Cron** | System for scheduling tasks to run automatically |
| **Log** | File recording events and errors |
| **Package** | A piece of software that can be installed |
| **apt** | Ubuntu's package manager (installs/updates software) |
| **VPS** | Virtual Private Server - your rented server |
| **Daemon** | A program that runs in the background as a service |

---

## Quick Reference Card

### Daily (Automated)
- ✅ Backups run at 2 AM
- ✅ Security updates checked

### Weekly (Optional - 2 min)
- Visit your sites, verify they load

### Monthly (Required - 15 min)
```bash
ssh root@hr.bifrostin.com
sudo apt update && sudo apt upgrade -y
df -h
ls -la /var/backups/hr-dashboard/ | tail -5
sudo systemctl status hr-dashboard nginx
exit
```

### After Critical Security Announcements
```bash
ssh root@hr.bifrostin.com
sudo apt update && sudo apt upgrade -y
sudo reboot  # if kernel updated
```

---

## Getting Help

### Resources

- **Ubuntu Documentation**: https://help.ubuntu.com
- **DigitalOcean Community Tutorials**: https://www.digitalocean.com/community/tutorials (works for any Linux server)
- **Nginx Documentation**: https://nginx.org/en/docs/

### When You're Stuck

1. Check the logs first (`journalctl`, `/var/log/`)
2. Search the error message on Google/Stack Overflow
3. Check Hetzner's status page for outages
4. Hetzner support (for infrastructure issues)

---

*Last updated: January 2026*
*For HR Dashboard on Hetzner Cloud*
