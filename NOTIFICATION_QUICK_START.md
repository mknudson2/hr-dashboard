# HR Dashboard Notifications - Quick Start Guide

## Current Status

✅ **Notification system is fully implemented and ready to use!**

- Frontend: Settings page saves preferences automatically
- Backend: API endpoints, email service, and scheduler configured
- Database: notification_preferences table created
- Email Status: **Currently in TEST MODE** (emails logged to console, not sent)

## How to Use

### 1. Configure Notifications (User)

1. Go to **Settings** page in the dashboard
2. Scroll to **Notifications** section
3. Toggle the notification types you want:
   - **Email Alerts**: Master switch (must be ON for others to work)
   - **New Hires**: Get notified when employees are added
   - **Terminations**: Get notified about terminations
   - **Wage Changes**: Get notified about compensation updates
   - **Weekly Report**: Receive weekly summary every Monday at 9 AM

4. Your preferences are **automatically saved** (both locally and to database)

### 2. Enable Email Sending (Admin/Developer)

**For Development/Testing (Current Mode):**
- Emails are logged to console but not sent
- No configuration needed
- See output like: `[EMAIL DISABLED] Would send to user@example.com: New Hire: John Doe`

**For Production (Actual Email Sending):**

1. Create `.env` file in `/backend/` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` with your email credentials:
   ```env
   # Gmail Configuration (Recommended for testing)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password  # Generate at https://myaccount.google.com/apppasswords
   FROM_EMAIL=noreply@nbshr.com
   EMAIL_ENABLED=true  # Change to true to send actual emails
   ```

3. Restart the backend server

### 3. Test Notifications

**Option A: Use the API directly**
```bash
# Test a new hire notification
curl -X POST "http://127.0.0.1:8000/notifications/test-notification/E001?notification_type=new_hire"

# Test a termination notification
curl -X POST "http://127.0.0.1:8000/notifications/test-notification/E001?notification_type=termination"

# Test a wage change notification
curl -X POST "http://127.0.0.1:8000/notifications/test-notification/E001?notification_type=wage_change"

# Manually trigger weekly reports
curl -X POST "http://127.0.0.1:8000/notifications/send-weekly-reports"
```

**Option B: Trigger through normal operations** (when integrated)
- Add a new employee → triggers new hire notification
- Set termination date → triggers termination notification
- Add wage history record → triggers wage change notification

### 4. View Your Preferences

```bash
# Check your saved preferences
curl "http://127.0.0.1:8000/notifications/preferences/your-email@example.com"

# See all subscribers
curl "http://127.0.0.1:8000/notifications/subscribers"
```

## What Gets Sent

### New Hire Notification
```
Subject: New Hire: John Doe

A new employee has been added to the HR system:
• Name: John Doe
• Department: Engineering
• Hire Date: 2025-01-15

Please welcome John Doe to the team!
```

### Termination Notification
```
Subject: Employee Termination: Jane Smith

An employee termination has been recorded:
• Name: Jane Smith
• Termination Date: 2025-01-20
• Type: Voluntary
```

### Wage Change Notification
```
Subject: Wage Change: Mike Johnson

A wage change has been recorded for:
• Employee: Mike Johnson
• Previous Wage: $75,000.00
• New Wage: $80,000.00
• Change: 6.7% increase
• Reason: Annual Review
```

### Weekly Summary Report (Mondays at 9 AM)
```
Subject: Weekly HR Summary - January 31, 2025

Employee Metrics:
• Total Active Employees: 127
• New Hires This Week: 3
• Terminations This Week: 1

YTD Metrics:
• YTD Hires: 8
• YTD Terminations: 4
• Turnover Rate: 3.1%

International Breakdown:
• Total International: 23
```

## Scheduled Jobs

The system automatically runs these jobs:

- **Weekly Reports**: Every Monday at 9:00 AM
  - Sends to all users with "Weekly Report" enabled
  - Includes comprehensive metrics

## Troubleshooting

### "I'm not receiving emails"

1. ✅ Check that `EMAIL_ENABLED=true` in backend/.env
2. ✅ Verify your email is saved in Settings
3. ✅ Ensure "Email Alerts" toggle is ON in Settings
4. ✅ Check specific notification type is enabled
5. ✅ Look at backend console for errors

### "Emails go to spam"

This is common when using Gmail/personal email servers. For production:
- Use a dedicated email service (SendGrid, AWS SES, Mailgun)
- Configure SPF/DKIM records
- Use a verified domain

### "How do I stop receiving notifications?"

1. Go to Settings page
2. Turn OFF "Email Alerts" (master toggle)
3. Or disable specific notification types individually

## Integration Points

To fully activate the notification system, integrate these calls into your employee management operations:

```python
from app.services.notification_service import notification_service

# When creating a new employee
notification_service.notify_new_hire(db, employee)

# When terminating an employee
notification_service.notify_termination(db, employee)

# When adding a wage history record
notification_service.notify_wage_change(db, employee, old_wage, new_wage, reason)
```

## Security Notes

- Never commit the `.env` file (it's in .gitignore)
- For Gmail, use App Passwords, not your regular password
- In production, use a dedicated email service provider
- Consider rate limiting for high-volume environments

## Support

For detailed documentation, see:
- `/backend/NOTIFICATIONS_README.md` - Complete technical documentation
- `/backend/.env.example` - Configuration template

---

**Status**: ✅ System Ready | 📧 Test Mode Active | 🔔 Notifications Configured
