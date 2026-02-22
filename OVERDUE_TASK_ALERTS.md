# Overdue Task Alert Feature - Implementation Guide

## Overview

This document explains the new **Overdue Task Alert** feature added to the daily reminders API route. This feature automatically notifies admins when assigned tasks become overdue (current date is past the due date and the task is not completed).

## What Was Added

### 1. **Core Feature in `/src/app/cron/daily-reminders/route.ts`**

The route now has two distinct email flows:

#### A. Volunteer Reminder Emails (Existing Feature - UNCHANGED)
- Sends daily updates to volunteers about their incomplete tasks
- Uses existing `email_tracking` table to prevent duplicates
- Sends max 1 email per day per task-volunteer pair

#### B. Admin Overdue Alerts (NEW FEATURE)
- Sends alerts to admins when tasks are overdue
- Only for incomplete tasks with a past due date
- Uses new `overdue_admin_alerts` table to prevent duplicates
- Tracks which overdue tasks have already been notified

### 2. **New Database Table: `overdue_admin_alerts`**

Located in `/migrations/002-overdue-admin-alerts.sql`

```sql
CREATE TABLE overdue_admin_alerts (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id),
  admin_email TEXT NOT NULL,
  alert_sent BOOLEAN DEFAULT TRUE,
  alert_sent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, volunteer_id, admin_email)
);
```

This table:
- **Tracks overdue task alerts** sent to admins
- **Prevents duplicate notifications** for the same task-volunteer pair
- **Stores timestamps** for audit trails
- **Ensures uniqueness** using composite key (task_id, volunteer_id, admin_email)

### 3. **New Helper Functions**

#### `sendOverdueTaskAlertEmail()`
Sends a formatted email to admins with inline HTML content including:
- Task title
- Assigned volunteer name and email
- Task due date
- Professional styling with warning colors

#### `hasOverdueAlertBeenSent()`
Checks if an overdue alert has already been sent for a task-volunteer pair

#### `recordOverdueAlertSent()`
Records in the database that an overdue alert was sent

#### `ensureOverdueAlertsTableExists()`
Gracefully handles cases where the table doesn't exist yet (backward compatibility)

### 4. **Admin Email List**

```typescript
const ADMIN_EMAILS = ['lekhashreeyc@gmail.com'];
```

**To add more admins**, modify this array:
```typescript
const ADMIN_EMAILS = [
  'lekhashreeyc@gmail.com',
  'another-admin@example.com',
  'third-admin@example.com'
];
```

## Setup Instructions

### Step 1: Create the Database Table

Run this SQL in your Supabase SQL Editor or via migration tool:

```sql
CREATE TABLE IF NOT EXISTS overdue_admin_alerts (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  alert_sent BOOLEAN DEFAULT TRUE,
  alert_sent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, volunteer_id, admin_email)
);

CREATE INDEX idx_overdue_admin_alerts_task_volunteer 
  ON overdue_admin_alerts(task_id, volunteer_id);

CREATE INDEX idx_overdue_admin_alerts_sent 
  ON overdue_admin_alerts(alert_sent, alert_sent_date);
```

### Step 2: Update Admin Email List

Edit [src/app/cron/daily-reminders/route.ts](src/app/cron/daily-reminders/route.ts#L16) and modify:

```typescript
const ADMIN_EMAILS = ['your-admin@example.com'];
```

That's it! **No Brevo template setup needed** — the system sends emails with inline HTML content.

## How It Works

### Daily Execution Flow

When the cron job runs (typically via `/api/cron/run-reminders`):

```
1. VALIDATION
   └─ Check all required environment variables

2. PART 1: VOLUNTEER REMINDERS (Existing Logic)
   ├─ Fetch all incomplete task assignments
   ├─ Check which ones already got emails today
   ├─ Send reminder emails to volunteers
   └─ Record in email_tracking table

3. PART 2: OVERDUE ALERTS (New Logic)
   ├─ Fetch all incomplete task assignments
   ├─ Filter for tasks with due_date < today
   ├─ For each overdue task:
   │  ├─ Check if alert already sent (via overdue_admin_alerts table)
   │  ├─ If NOT sent:
   │  │  ├─ Send alert to each admin email
   │  │  └─ Record in overdue_admin_alerts table
   │  └─ If already sent:
   │     └─ Skip (prevent duplicates)
   └─ Log summary

4. RESPONSE
   └─ Return result with counts
      {
        "success": true,
        "message": "Sent 5 reminder emails and 2 overdue alerts",
        "reminderEmailsSent": 5,
        "overdueAlertsSent": 2,
        "totalEmailsSent": 7
      }
```

### Duplicate Prevention

**For Regular Reminders:**
- Uses `email_tracking` table
- Checks if email was sent **today** only (daily reset)
- Resets each day

**For Overdue Alerts:**
- Uses `overdue_admin_alerts` table
- Checks if alert was sent **ever** (no reset)
- Only sends once per task-volunteer pair unless task is re-assigned or goes back to "Pending"
- Must be manually reset in database if needed

## Example Scenarios

### Scenario 1: New Overdue Task
```
Task: "Organize donation drive"
Volunteer: John Doe
Due Date: 2026-02-01
Current Date: 2026-02-15 (14 days overdue)
Status: Pending

✅ Admin email sent (first time)
✅ Record created in overdue_admin_alerts
```

### Scenario 2: Already Notified Overdue Task
```
Task: "Organize donation drive"
Volunteer: John Doe
Due Date: 2026-02-01
Current Date: 2026-02-16 (15 days overdue)
Status: Pending
Previous Alert: Already sent on 2026-02-15

❌ No email sent (already notified once)
```

### Scenario 3: Completed Task
```
Task: "Organize donation drive"
Volunteer: John Doe
Due Date: 2026-02-01
Status: Completed

❌ No alert sent (task is completed)
```

### Scenario 4: Multiple Admins
```
ADMIN_EMAILS = ['admin1@company.com', 'admin2@company.com']

When an overdue task is found:
✅ Email sent to admin1@company.com
✅ Email sent to admin2@company.com
✅ Two records created in overdue_admin_alerts
```

## Testing

### Manual Test via API

1. **Create test data** in your database:
   ```sql
   -- Task that's overdue
   INSERT INTO tasks (title, due_date, status) 
   VALUES ('Test Overdue Task', '2026-01-01', 'Pending');
   
   -- Assign to volunteer
   INSERT INTO task_assignments (task_id, volunteer_id)
   VALUES (1, 1);
   ```

2. **Trigger the cron endpoint**:
   ```bash
   curl "http://localhost:3000/api/cron/daily-reminders?key=YOUR_CRON_SECRET"
   ```

3. **Check response**:
   ```json
   {
     "success": true,
     "message": "Sent 0 reminder emails and 1 overdue alerts",
     "reminderEmailsSent": 0,
     "overdueAlertsSent": 1,
     "totalEmailsSent": 1
   }
   ```

4. **Verify admin email received** the overdue alert

### Check Database Records

```sql
-- View all overdue alerts sent
SELECT * FROM overdue_admin_alerts;

-- View alerts for specific task
SELECT * FROM overdue_admin_alerts WHERE task_id = 1;

-- View alerts for specific admin
SELECT * FROM overdue_admin_alerts WHERE admin_email = 'admin@example.com';
```

## Customization & Email Content

### Email Format

The overdue alert email is sent with professional HTML formatting including:

```html
Subject: Overdue Task Alert

Body:
⚠️ Overdue Task Alert

Hello Admin,

The following task is OVERDUE and still incomplete:

Task: [Task Title]
Assigned Volunteer: [Volunteer Name]
Email: [Volunteer Email]
Due Date: [Due Date]

This task was expected to be completed by [Due Date] but remains incomplete.

Please follow up with the assigned volunteer to ensure timely completion.
```

### Customize Admin Email List

Edit `const ADMIN_EMAILS` array in [src/app/cron/daily-reminders/route.ts](src/app/cron/daily-reminders/route.ts#L16):

```typescript
// Single admin
const ADMIN_EMAILS = ['admin@company.com'];

// Multiple admins
const ADMIN_EMAILS = [
  'admin1@company.com',
  'admin2@company.com',
  'supervisor@company.com'
];
```

### Customize Email HTML (Advanced)

To modify the email appearance, edit the `htmlContent` variable in the `sendOverdueTaskAlertEmail()` function in [src/app/cron/daily-reminders/route.ts](src/app/cron/daily-reminders/route.ts#L41-L85). The HTML includes:
- CSS styling for professional formatting
- Variable placeholders: `${taskTitle}`, `${volunteerName}`, `${volunteerEmail}`, `${dueDate}`

## Monitoring & Debugging

### Check Logs

```bash
# View cron job logs
docker logs <container-id> 2>&1 | grep "Daily Reminders"

# Filter for overdue alerts only
docker logs <container-id> 2>&1 | grep "Overdue alert"
```

### Common Issues

**Problem:** "overdue_admin_alerts table not found"
```
Solution: Run the SQL migration to create the table
```

**Problem:** Admin not receiving emails
```
Checklist:
1. [ ] Admin email is in ADMIN_EMAILS array
2. [ ] Brevo API key is valid
3. [ ] SQL migration was run to create overdue_admin_alerts table
4. [ ] Task has a due_date field
5. [ ] Task status is 'Pending' (not 'Completed')
6. [ ] Current date is after task.due_date
```

**Problem:** Duplicate alerts being sent
```
Check: Are there multiple entries in overdue_admin_alerts for same task-volunteer?
Solution: Database has UNIQUE constraint, shouldn't happen unless constraint is dropped
```

## API Response Format

```typescript
{
  success: boolean,
  message: string,
  reminderEmailsSent: number,      // Regular volunteer reminders
  overdueAlertsSent: number,        // New overdue alerts to admins
  totalEmailsSent: number           // reminderEmailsSent + overdueAlertsSent
}
```

## Important Notes

✅ **Feature doesn't affect existing functionality** - Volunteer reminders work exactly as before

✅ **Database-backed deduplication** - Uses overdue_admin_alerts table to prevent re-sending

✅ **Graceful degradation** - Works even if table doesn't exist yet (logs warning, continues)

✅ **Admin emails can be modified** - Easy to add/remove admins by editing ADMIN_EMAILS array

✅ **Uses inline HTML emails** - No Brevo template setup needed, content defined in code

✅ **Fully customizable** - Email appearance can be modified via HTML in the function

⚠️ **Requires database migration** - Run the SQL to create overdue_admin_alerts table

⚠️ **One-time notification** - Once admin is notified, won't send again unless task details change

## Related Files

- [Daily Reminders Route](src/app/cron/daily-reminders/route.ts)
- [Brevo Utilities](src/lib/brevo.ts)
- [Migration Script](migrations/002-overdue-admin-alerts.sql)
- [Schema Reference](schema.sql)
