# HR Dashboard Notification System

## Overview

The HR Dashboard includes a comprehensive notification system that sends email alerts for important employee events and weekly summary reports.

## Features

### 1. **Event-Based Notifications**
- **New Hires**: Automatic notifications when new employees are added
- **Terminations**: Alerts when employee terminations are recorded
- **Wage Changes**: Notifications for compensation updates

### 2. **Scheduled Reports**
- **Weekly Summary**: Automated weekly reports sent every Monday at 9:00 AM
- Includes metrics like active employees, new hires, terminations, turnover rate, and international headcount

### 3. **User Preferences**
- Users can customize which notifications they receive
- Preferences are stored in the database and persist across sessions
- Master toggle to enable/disable all email alerts

## Setup

### 1. Email Configuration

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure your email settings:

```env
# For Gmail (recommended for testing)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@nbshr.com
EMAIL_ENABLED=true
```

**Important for Gmail Users:**
1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password) in `SMTP_PASSWORD`

### 2. Enable Email Sending

By default, `EMAIL_ENABLED=false` which means emails are logged to console but not sent. This is useful for development.

To enable actual email sending:
```env
EMAIL_ENABLED=true
```

## API Endpoints

### Save/Update Notification Preferences
```http
POST /notifications/preferences
Content-Type: application/json

{
  "email": "user@example.com",
  "preferences": {
    "emailAlerts": true,
    "newHires": true,
    "terminations": true,
    "wageChanges": false,
    "ptoRequests": true,
    "weeklyReport": true
  }
}
```

### Get Notification Preferences
```http
GET /notifications/preferences/{email}
```

### Get All Subscribers
```http
GET /notifications/subscribers
```

### Manually Trigger Weekly Reports
```http
POST /notifications/send-weekly-reports
```

### Test Notifications
```http
POST /notifications/test-notification/{employee_id}?notification_type=new_hire
POST /notifications/test-notification/{employee_id}?notification_type=termination
POST /notifications/test-notification/{employee_id}?notification_type=wage_change
```

## Automated Triggers

The notification system automatically detects and sends notifications for:

1. **New Hires**: When an employee is created with a recent hire_date
2. **Terminations**: When an employee's termination_date is set
3. **Wage Changes**: When a wage_history record is added

To integrate these triggers, call the notification service from your CRUD operations:

```python
from app.services.notification_service import notification_service

# After creating a new employee
notification_service.notify_new_hire(db, employee)

# After updating termination_date
notification_service.notify_termination(db, employee)

# After adding wage history
notification_service.notify_wage_change(db, employee, old_wage, new_wage, reason)
```

## Scheduled Jobs

The system uses APScheduler to run periodic tasks:

- **Weekly Reports**: Every Monday at 9:00 AM
  - Sends comprehensive HR metrics to all subscribed users
  - Includes weekly and YTD statistics

The scheduler starts automatically when the FastAPI application starts and shuts down gracefully when the application stops.

## Email Templates

All notification emails include:
- HTML and plain text versions
- Professional formatting with color-coded headers
- Relevant employee information
- Automated footer with branding

### Email Types:

#### New Hire Notification
- Employee name, department, and hire date
- Welcome message

#### Termination Notification
- Employee name, termination date, and type (voluntary/involuntary)

#### Wage Change Notification
- Employee name
- Previous and new wage amounts
- Percentage change
- Reason for change

#### Weekly Summary Report
- Active employee count
- New hires and terminations (this week)
- YTD metrics (hires, terminations, turnover rate)
- International employee count

## Testing

### Testing with Console Output (EMAIL_ENABLED=false)

When `EMAIL_ENABLED=false`, all emails are printed to the console instead of being sent. This is useful for development and testing.

Example console output:
```
[EMAIL DISABLED] Would send to user@example.com: New Hire: John Doe
```

### Testing with Actual Emails (EMAIL_ENABLED=true)

1. Configure your .env file with valid SMTP credentials
2. Set `EMAIL_ENABLED=true`
3. Use the Settings page in the frontend to:
   - Save your email address
   - Enable email alerts
   - Select which notification types you want
4. Use the test endpoint to trigger a notification:
   ```bash
   curl -X POST "http://127.0.0.1:8000/notifications/test-notification/E001?notification_type=new_hire"
   ```

### Testing Weekly Reports

Manually trigger the weekly report job:
```bash
curl -X POST "http://127.0.0.1:8000/notifications/send-weekly-reports"
```

## Troubleshooting

### Emails Not Sending

1. **Check EMAIL_ENABLED**: Ensure it's set to `true` in `.env`
2. **Verify SMTP Credentials**: Test your credentials manually
3. **Check Firewall**: Ensure port 587 is not blocked
4. **Gmail Users**: Make sure you're using an App Password, not your regular password
5. **Check Logs**: Look for error messages in the console

### Notifications Not Triggering

1. **Verify Preferences**: Check that user has enabled email alerts in Settings
2. **Check Database**: Ensure notification_preferences table has the user's settings
3. **Integration**: Ensure notification service is called from CRUD operations

### Scheduler Not Running

1. **Check Logs**: Look for "Scheduler started successfully" message on startup
2. **Verify Installation**: Ensure APScheduler is installed (`pip install apscheduler`)
3. **Check Timezone**: Verify the scheduler is using the correct timezone

## Security Considerations

1. **Never commit .env file**: The `.env` file is in `.gitignore`
2. **Use App Passwords**: For Gmail, always use App Passwords, not regular passwords
3. **Limit Permissions**: Use email accounts with minimal permissions
4. **Rate Limiting**: Consider implementing rate limiting for production use
5. **Email Validation**: Validate email addresses before storing preferences

## Production Recommendations

1. **Use a Dedicated Email Service**: Consider services like SendGrid, AWS SES, or Mailgun for production
2. **Implement Queue System**: For high volume, use a message queue (Celery, RabbitMQ)
3. **Add Retry Logic**: Implement exponential backoff for failed email sends
4. **Monitor Email Delivery**: Track delivery rates and failures
5. **Add Unsubscribe Links**: Include unsubscribe functionality in emails
6. **GDPR Compliance**: Ensure compliance with email notification regulations

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Settings UI)  │
└────────┬────────┘
         │ POST /notifications/preferences
         ▼
┌─────────────────────────────┐
│  Notification API           │
│  (notifications.py)         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Database                   │
│  (notification_preferences) │
└─────────────────────────────┘

┌─────────────────┐
│   CRUD Ops      │
│  (Add Employee) │
└────────┬────────┘
         │ notify_new_hire()
         ▼
┌─────────────────────────────┐
│  Notification Service       │
│  (notification_service.py)  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Email Service              │
│  (email_service.py)         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  SMTP Server                │
│  (Gmail, SendGrid, etc.)    │
└─────────────────────────────┘

┌─────────────────┐
│  Scheduler      │
│  (APScheduler)  │
└────────┬────────┘
         │ Every Monday 9:00 AM
         ▼
┌─────────────────────────────┐
│  send_weekly_reports_job()  │
│  (scheduler.py)             │
└─────────────────────────────┘
```

## Files Structure

```
backend/
├── app/
│   ├── api/
│   │   └── notifications.py       # API endpoints
│   ├── services/
│   │   ├── email_service.py       # Email sending logic
│   │   ├── notification_service.py # Event triggers
│   │   └── scheduler.py           # Scheduled jobs
│   ├── db/
│   │   └── models.py              # NotificationPreference model
│   └── main.py                    # App initialization with scheduler
├── .env.example                   # Example configuration
└── NOTIFICATIONS_README.md        # This file
```

## Future Enhancements

- [ ] SMS notifications (Twilio integration)
- [ ] In-app notifications
- [ ] Notification history/audit log
- [ ] Custom notification templates
- [ ] Notification digest (daily summary)
- [ ] Priority levels for notifications
- [ ] Notification channels (email, slack, teams)
