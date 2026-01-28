# HR Dashboard - Deployment Guide

This guide walks you through deploying the HR Dashboard to a production server.

## Overview

| Component | Production URL |
|-----------|---------------|
| HR Hub | https://hr.bifrostin.com |
| Employee Portal | https://portal.bifrostin.com |
| Backend API | Internal (port 8000) |

---

## Prerequisites

Before starting, you'll need:

1. **A domain name** (we'll use bifrostin.com as an example)
2. **A VPS server** (see VPS recommendation below)
3. **SSH access** to your server
4. **Your local development environment** working

---

## VPS Recommendation

For your use case (1-3 HR Hub users, 5-15 portal users), I recommend:

### **Hetzner Cloud** (Best Value)
- **Plan**: CX22 (2 vCPU, 4GB RAM) - €4.35/month (~$5)
- **Why**: Excellent performance, great value, German company with US data centers
- **Sign up**: https://www.hetzner.com/cloud

### Alternative: **DigitalOcean** (Most Beginner-Friendly)
- **Plan**: Basic Droplet (1 vCPU, 2GB RAM) - $12/month
- **Why**: Excellent documentation, very user-friendly interface
- **Sign up**: https://www.digitalocean.com

---

## Domain Setup

### Option A: New Domain for This Project
Register one of these (check availability):
- `bifrostin.com` → hr.bifrostin.com, portal.bifrostin.com
- `bifrost.hr` → app.bifrost.hr, portal.bifrost.hr
- `bifrosthr.com` → hr.bifrosthr.com, portal.bifrosthr.com

**Registrars**: Namecheap (~$10/year), Cloudflare (~$9/year), Porkbun (~$9/year)

### Option B: Subdomain of Future Company Domain
If you plan to register `bifrostin.com` for Bifröstin Digital Solutions anyway:
- Use `hr.bifrostin.com` for HR Hub
- Use `portal.bifrostin.com` for Employee Portal

---

## Step-by-Step Deployment

### Step 1: Create Your VPS

#### Using Hetzner:
1. Go to https://console.hetzner.cloud
2. Create a new project
3. Add a new server:
   - **Location**: Choose closest to you (Ashburn, VA for US East)
   - **Image**: Ubuntu 24.04
   - **Type**: CX22 (or CX11 if you want cheaper)
   - **SSH Key**: Add your public key (or use password)
4. Note the IP address (e.g., `123.45.67.89`)

#### Using DigitalOcean:
1. Go to https://cloud.digitalocean.com
2. Create Droplet:
   - **Image**: Ubuntu 24.04
   - **Plan**: Basic, Regular, $12/mo
   - **Region**: Choose closest to you
   - **Authentication**: SSH keys (recommended)
3. Note the IP address

---

### Step 2: Configure DNS

In your domain registrar's DNS settings, add these A records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | hr | 123.45.67.89 | 300 |
| A | portal | 123.45.67.89 | 300 |

Replace `123.45.67.89` with your server's IP address.

**Wait 5-10 minutes** for DNS to propagate before continuing.

Verify with: `ping hr.bifrostin.com`

---

### Step 3: Initial Server Setup

SSH into your server:
```bash
ssh root@123.45.67.89
# or
ssh root@hr.bifrostin.com  # after DNS propagates
```

Upload and run the setup script:
```bash
# On your Mac, upload the setup script:
scp deployment/setup-server.sh root@123.45.67.89:/root/

# On the server, run it:
chmod +x /root/setup-server.sh
/root/setup-server.sh
```

The script will:
- Install Nginx, Python, Node.js
- Configure the firewall
- Set up SSL certificates (you'll need to confirm DNS is working)

---

### Step 4: Upload Your Application

#### Option A: Using rsync (Recommended)

On your Mac:
```bash
# First, build the frontend applications
cd /Users/michaelknudson/Desktop/hr-dashboard
bash deployment/build-local.sh

# Upload everything to the server
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='.env' \
  ./ root@hr.bifrostin.com:/home/deploy/hr-dashboard/
```

#### Option B: Using Git (if you have a repository)

On the server:
```bash
cd /home/deploy
git clone https://github.com/yourusername/hr-dashboard.git
```

---

### Step 5: Configure Environment Variables

On the server:
```bash
# Create the production environment file
cp /home/deploy/hr-dashboard/deployment/.env.production.example \
   /var/www/hr-dashboard/backend/.env.production

# Edit with your values
nano /var/www/hr-dashboard/backend/.env.production
```

**Important**: Generate new secret keys:
```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate FIELD_ENCRYPTION_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Update the `.env.production` file with:
- Your generated secret keys
- Your domain names
- Email settings (optional)

---

### Step 6: Deploy the Application

On the server:
```bash
cd /home/deploy/hr-dashboard
sudo bash deployment/deploy.sh
```

This will:
- Build frontend applications (if not already built)
- Copy files to production directories
- Set up Python virtual environment
- Install dependencies
- Configure and start services

---

### Step 7: Verify Deployment

1. **Check service status**:
   ```bash
   sudo systemctl status hr-dashboard
   ```

2. **Check logs** (if there are issues):
   ```bash
   sudo journalctl -u hr-dashboard -f
   ```

3. **Test in browser**:
   - HR Hub: https://hr.bifrostin.com
   - Employee Portal: https://portal.bifrostin.com

---

### Step 8: Set Up Automated Backups

On the server:
```bash
# Test backup script
sudo bash /home/deploy/hr-dashboard/deployment/backup.sh

# Add to crontab for daily backups at 2 AM
sudo crontab -e
# Add this line:
0 2 * * * /home/deploy/hr-dashboard/deployment/backup.sh >> /var/log/hr-dashboard/backup.log 2>&1
```

---

## Updating the Application

When you make changes and want to deploy updates:

### On your Mac:
```bash
cd /Users/michaelknudson/Desktop/hr-dashboard

# Build frontend
bash deployment/build-local.sh

# Upload changes
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='venv' \
  --exclude='__pycache__' \
  ./ root@hr.bifrostin.com:/home/deploy/hr-dashboard/
```

### On the server:
```bash
cd /home/deploy/hr-dashboard
sudo bash deployment/deploy.sh
```

---

## Troubleshooting

### "502 Bad Gateway" Error
The backend isn't running:
```bash
sudo systemctl status hr-dashboard
sudo journalctl -u hr-dashboard -n 50
```

### "Connection Refused" Error
Check if services are running:
```bash
sudo systemctl status nginx
sudo systemctl status hr-dashboard
```

### SSL Certificate Issues
Renew certificates:
```bash
sudo certbot renew
```

### Database Issues
Check database file permissions:
```bash
ls -la /var/www/hr-dashboard/backend/data/
sudo chown www-data:www-data /var/www/hr-dashboard/backend/data/hr_dashboard.db
```

### View Application Logs
```bash
# Backend logs
sudo journalctl -u hr-dashboard -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall enabled (only ports 22, 80, 443 open)
- [ ] Strong passwords/SSH keys for server access
- [ ] `.env.production` file has secure permissions (chmod 600)
- [ ] Unique SECRET_KEY and FIELD_ENCRYPTION_KEY generated
- [ ] Regular backups configured
- [ ] Changed default admin password in the application

---

## Cost Summary

| Item | Monthly Cost | Annual Cost |
|------|-------------|-------------|
| VPS (Hetzner CX22) | ~$5 | ~$60 |
| Domain (.com) | - | ~$12 |
| SSL Certificates | Free | Free |
| **Total** | **~$5/month** | **~$72/year** |

---

## Support

If you encounter issues:
1. Check the logs (see Troubleshooting section)
2. Verify DNS is pointing to your server
3. Ensure all environment variables are set correctly
4. Check that services are running

