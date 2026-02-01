# Integration Guide: Scheduled Tasks + Brevo Email API

This document explains how the scheduled task reminder system integrates with the existing Brevo transactional email API.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js Application                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ src/app/layout.tsx                                       │   │
│  │ (Server startup)                                         │   │
│  └─────────────────────┬──────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ BackgroundJobsInitializer Component                      │   │
│  │ src/components/BackgroundJobsInitializer.tsx             │   │
│  └─────────────────────┬──────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ initializeBackgroundJobs()                               │   │
│  │ src/lib/init-background-jobs.ts                          │   │
│  └─────────────────────┬──────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Cron Scheduler (node-cron)                               │   │
│  │ src/lib/cron-jobs.ts                                     │   │
│  │ Runs: 0 8 * * * (8 AM UTC daily)                         │   │
│  └─────────────────────┬──────────────────────────────────┘   │
│                        │                                        │
│                        ├──────────────────────────┐             │
│                        │ (Auto daily) or          │             │
│                        │ Manual trigger via API   │             │
│                        │                          │             │
│                        ▼                          ▼             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ processPendingTaskReminders()                            │   │
│  │ src/lib/scheduled-tasks.ts                               │   │
│  │  1. Fetch all tasks (status = "Pending")                 │   │
│  │  2. Find volunteer assignments                           │   │
│  │  3. For each volunteer:                                  │   │
│  │     a. Check if email sent today                         │   │
│  │     b. Send reminder email                               │   │
│  │     c. Record sent email                                 │   │
│  │  4. Return statistics                                    │   │
│  └─────────────────────┬──────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ sendTaskReminderEmail()                                  │   │
│  │ src/lib/brevo.ts                                         │   │
│  │  1. Prepare email parameters                             │   │
│  │  2. Format for Brevo API                                 │   │
│  │  3. Send to Brevo                                        │   │
│  │  4. Return message ID                                    │   │
│  └─────────────────────┬──────────────────────────────────┘   │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         │ HTTPS API Call
                         │ (BREVO_API_KEY)
                         │
                         ▼
         ┌───────────────────────────────┐
         │ Brevo Email API               │
         │ api.brevo.com/v3/smtp/email   │
         └───────────────┬───────────────┘
                         │
                         │ Template ID: 1 (configurable)
                         │ Parameters: VOLUNTEER_NAME, TASK_TITLE,
                         │            DUE_DATE, TASK_ID, VOLUNTEER_ID
                         │
                         ▼
         ┌───────────────────────────────┐
         │ Email Sent to Volunteer       │
         │ volunteer@example.com         │
         └───────────────────────────────┘
```

## Data Flow

### 1. Scheduler Initialization (Startup)

```typescript
// src/app/layout.tsx
<BackgroundJobsInitializer />
  ↓
// src/lib/init-background-jobs.ts
initializeBackgroundJobs()
  ↓
// src/lib/cron-jobs.ts
initializeCronJobs('0 8 * * *', false)
  ↓
// Cron job ready, will run at 8 AM UTC daily
```

### 2. Job Execution (Daily or Manual)

```typescript
// Automatic: Daily at 8 AM UTC
// Or Manual: POST /api/cron/trigger

processPendingTaskReminders()
  ↓
Query Supabase:
  SELECT * FROM tasks WHERE status = 'Pending'
  ↓
For each task:
  SELECT * FROM task_assignments WHERE task_id = ?
  SELECT * FROM volunteers WHERE id = ?
  ↓
  For each volunteer:
    Check email tracking cache
    ↓
    IF NOT sent today:
      sendTaskReminderEmail(taskId, volunteerId, email, name, title, dueDate)
      ↓
      recordEmailSent(taskId, volunteerId, messageId)
  ↓
Return statistics
```

### 3. Email Sending (Brevo Integration)

```typescript
// src/lib/brevo.ts
sendTaskReminderEmail(
  taskId: 1,
  volunteerId: 5,
  email: "john@example.com",
  name: "John Doe",
  title: "Organize donation drive",
  dueDate: "2026-02-14"
)
  ↓
Prepare Brevo payload:
{
  "to": [{ "email": "john@example.com" }],
  "templateId": 1,
  "params": {
    "VOLUNTEER_NAME": "John Doe",
    "TASK_TITLE": "Organize donation drive",
    "DUE_DATE": "2026-02-14",
    "TASK_ID": "1",
    "VOLUNTEER_ID": "5"
  }
}
  ↓
POST to: https://api.brevo.com/v3/smtp/email
Header: api-key: BREVO_API_KEY
  ↓
Response: { "messageId": "123456789" }
  ↓
recordEmailSent(taskId, volunteerId, messageId)
```

## Database Schema Integration

### Tables Involved

```sql
-- Tasks table
tasks (
  id,
  title,
  due_date,
  status  -- Must be 'Pending' for emails to be sent
)

-- Volunteers table (UPDATED)
volunteers (
  id,
  full_name,
  email,    -- NEW: Required for sending emails
  role,
  status,
  joining_date,
  avatar_url,
  created_at
)

-- Task Assignments table
task_assignments (
  id,
  task_id,        -- Links to tasks
  volunteer_id,   -- Links to volunteers
  assigned_at
)
```

### Sample Query Flow

```sql
-- 1. Get all pending tasks
SELECT id, title, due_date, status FROM tasks WHERE status = 'Pending'

-- 2. For each task, get assigned volunteers
SELECT ta.volunteer_id
FROM task_assignments ta
WHERE ta.task_id = $1

-- 3. Get volunteer details
SELECT id, full_name, email FROM volunteers WHERE id = $1

-- 4. Send email with this data
-- Email will have:
--   To: volunteer.email
--   Name: volunteer.full_name
--   Task: task.title
--   Due: task.due_date
```

## Email Tracking (Duplicate Prevention)

### In-Memory Cache

```typescript
// src/lib/email-tracking.ts

// Cache structure:
Map<"taskId-volunteerId-date", {timestamp, messageId}>

// Example:
"1-5-2026-01-30" → {
  timestamp: 1704067200000,
  messageId: "123456789"
}

// Key generation: `${taskId}-${volunteerId}-YYYY-MM-DD`

// Check before sending:
if (hasEmailBeenSentToday(taskId, volunteerId)) {
  // Skip - already sent today
} else {
  // Send email
  recordEmailSent(taskId, volunteerId, messageId)
}
```

## Configuration & Customization

### Change Email Template

1. Create new template in Brevo Dashboard
2. Note the template ID
3. Pass it to sendTaskReminderEmail:

```typescript
await sendTaskReminderEmail(
  taskId, volunteerId, email, name, title, dueDate,
  2  // Template ID = 2
)
```

### Change Daily Schedule

Edit `src/lib/init-background-jobs.ts`:

```typescript
// Current: 8 AM UTC daily
initializeCronJobs('0 8 * * *', false)

// Change to 9 AM UTC
initializeCronJobs('0 9 * * *', false)

// Change to 2 PM UTC weekdays only
initializeCronJobs('0 14 * * 1-5', false)
```

### Modify Email Parameters

Add to template parameters in `src/lib/brevo.ts`:

```typescript
const params = {
  VOLUNTEER_NAME: volunteerName,
  TASK_TITLE: taskTitle,
  DUE_DATE: dueDate,
  TASK_ID: taskId.toString(),
  VOLUNTEER_ID: volunteerId.toString(),
  CUSTOM_PARAM: "custom value"  // Add new parameter
};
```

Then use in Brevo template: `{{params.CUSTOM_PARAM}}`

## Error Handling & Logging

### Logging Prefixes

| Prefix | Source | Purpose |
|--------|--------|---------|
| `[Task Reminder Job]` | scheduled-tasks.ts | Job execution logs |
| `[Cron Jobs]` | cron-jobs.ts | Scheduler logs |
| `[API]` | api/cron/trigger/route.ts | API endpoint logs |

### Example Log Sequence

```
[Cron Jobs] Executing scheduled task reminder job...
[Task Reminder Job] Starting scheduled task reminder job...
[Task Reminder Job] Found 3 pending tasks
[Task Reminder Job] Email sent for task 1 to john@example.com (Message ID: 1234567890)
[Task Reminder Job] Email sent for task 1 to jane@example.com (Message ID: 1234567891)
[Task Reminder Job] Email already sent today for task 2, volunteer 7
[Task Reminder Job] Email sent for task 3 to bob@example.com (Message ID: 1234567892)
[Task Reminder Job] Job completed in 2.5s. Sent 3 emails, 0 failed.
[Cron Jobs] Task Reminder Job Summary:
- Timestamp: 2026-01-30T08:00:00.000Z
- Tasks Processed: 3
- Emails Sent: 3
- Emails Failed: 0
- Status: Success
```

### Error Scenarios

1. **BREVO_API_KEY not set**
   ```
   Error: BREVO_API_KEY environment variable is not set
   ```
   Fix: Add to `.env.local`

2. **Volunteer not found**
   ```
   Error: Volunteer {id} not found
   ```
   Fix: Verify volunteer exists and email is set

3. **Task completed**
   ```
   Email not sent: Task is already completed
   ```
   Expected: Task status is "Completed"

## Performance Considerations

### Time Complexity
- Fetching N pending tasks: O(N)
- For M volunteers per task: O(N × M) database calls
- Email sending: O(N × M) API calls to Brevo (sequential)

### Optimization Tips

For large datasets:
1. Consider batch operations in database queries
2. Add pagination if tasks exceed 1000
3. Monitor Brevo API rate limits
4. Consider async email queue for production

### Storage

- In-memory email cache: ~100 bytes per record
- Typical: 1000-5000 records per month
- Memory: ~100-500 KB

## Deployment Checklist

- [ ] Add `node-cron` dependency (`npm install`)
- [ ] Update database schema (add email column)
- [ ] Set `BREVO_API_KEY` environment variable
- [ ] Create Brevo transactional email template
- [ ] Populate volunteer email addresses
- [ ] Test with manual API trigger
- [ ] Monitor logs on first scheduled run
- [ ] Verify emails received by test volunteers

## Monitoring in Production

### Key Metrics

```bash
# Check scheduler status
curl http://your-app.com/api/cron/status

# Manual trigger for monitoring
curl -X POST http://your-app.com/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'
```

### Alert Conditions

- Scheduler status returns `running: false`
- Job logs show `Status: Failed`
- Email success rate < 95%
- Execution time > 5 minutes

### Log Monitoring

Search logs for:
- `[Task Reminder Job]` - All job logs
- `Error` - Any errors during execution
- `Failed` - Job failures
