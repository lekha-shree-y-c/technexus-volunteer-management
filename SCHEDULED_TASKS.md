# Scheduled Task Reminder System

This system automatically sends task reminder emails to assigned volunteers once per day using a cron-style scheduler.

## Architecture

The scheduled task reminder system consists of:

1. **[src/lib/scheduled-tasks.ts](src/lib/scheduled-tasks.ts)** - Core task processor
   - `processPendingTaskReminders()` - Fetches pending tasks and sends emails
   - Returns detailed execution statistics

2. **[src/lib/cron-jobs.ts](src/lib/cron-jobs.ts)** - Cron job scheduler
   - `initializeCronJobs()` - Start the scheduler
   - `manuallyTriggerTaskReminderJob()` - Manual execution
   - `rescheduleCronJob()` - Change schedule at runtime

3. **[src/lib/init-background-jobs.ts](src/lib/init-background-jobs.ts)** - Startup initialization
   - Configures the cron schedule on app startup

4. **[src/app/api/cron/trigger/route.ts](src/app/api/cron/trigger/route.ts)** - API endpoints
   - `POST /api/cron/trigger` - Manually trigger the job
   - `GET /api/cron/status` - Check scheduler status

## How It Works

### Daily Execution

1. **Server Startup**: When the Next.js app starts, background jobs are initialized
2. **Scheduled Run**: Job runs automatically at **08:00 AM UTC** every day
3. **Task Processing**: 
   - Fetches all tasks with status = `"Pending"`
   - For each task, finds all assigned volunteers
   - Sends reminder email to each volunteer
   - Skips if email was already sent today (prevents duplicates)
   - Stops sending emails for completed tasks

### Execution Flow

```
Daily Schedule (8 AM UTC)
    ↓
processPendingTaskReminders()
    ↓
Fetch all "Pending" tasks
    ↓
For each task:
  ↓
  Fetch assigned volunteers
  ↓
  For each volunteer:
    ↓
    Check if email already sent today
    ↓
    Check task status (skip if "Completed")
    ↓
    Send email via Brevo API
    ↓
    Record message ID
  ↓
Return statistics
```

## Configuration

### Change Daily Schedule

Edit [src/lib/init-background-jobs.ts](src/lib/init-background-jobs.ts):

```typescript
// Current: 8 AM UTC every day
initializeCronJobs('0 8 * * *', false);

// Change to 9 AM UTC
initializeCronJobs('0 9 * * *', false);

// Change to 2 PM UTC on weekdays only
initializeCronJobs('0 14 * * 1-5', false);
```

### Cron Expression Format

The cron format is: `minute hour day-of-month month day-of-week`

Common examples:
- `0 8 * * *` - Every day at 8:00 AM UTC
- `0 9 * * 1-5` - Weekdays at 9:00 AM UTC (Monday-Friday)
- `0 12 * * 0` - Every Sunday at 12:00 PM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 1 * *` - First day of each month at midnight UTC

## API Endpoints

### Manually Trigger the Job

```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'
```

Response:
```json
{
  "success": true,
  "message": "Job executed successfully",
  "result": {
    "success": true,
    "timestamp": "2026-01-30T10:15:00.000Z",
    "totalTasksProcessed": 3,
    "totalEmailsSent": 5,
    "totalEmailsFailed": 0,
    "taskResults": [
      {
        "taskId": 1,
        "taskTitle": "Organize donation drive",
        "emailsSent": 2,
        "emailsFailed": 0,
        "errors": []
      }
    ]
  }
}
```

### Check Scheduler Status

```bash
curl http://localhost:3000/api/cron/status
```

Response:
```json
{
  "success": true,
  "running": true,
  "message": "Cron job scheduler is running"
}
```

### Reschedule the Job

```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "reschedule", "schedule": "0 9 * * *"}'
```

## Features

✅ **Daily Execution** - Runs automatically once per day  
✅ **Pending Tasks Only** - Processes only non-completed tasks  
✅ **Prevents Duplicates** - One email per volunteer per task per day  
✅ **Respects Task Status** - Stops sending if task is marked "Completed"  
✅ **Detailed Logging** - Console logs with `[Task Reminder Job]` prefix  
✅ **Error Handling** - Gracefully handles individual email failures  
✅ **Execution Stats** - Returns detailed statistics on each run  
✅ **Manual Triggering** - Can be triggered manually via API  
✅ **Runtime Rescheduling** - Change schedule without restarting server  
✅ **Backend Only** - No UI changes or user-facing components  

## Logging

All scheduled job operations are logged with the prefix `[Task Reminder Job]`:

```
[Task Reminder Job] Starting scheduled task reminder job...
[Task Reminder Job] Found 3 pending tasks
[Task Reminder Job] Email sent for task 1 to john@example.com (Message ID: 1234567890)
[Task Reminder Job] Job completed in 2.5s. Sent 5 emails, 0 failed.
```

## Behavior

### Pending Tasks
- Only tasks with `status = 'Pending'` are processed
- Completed tasks are automatically skipped

### Email Limits
- **One email per day**: If an email was already sent today to a volunteer for a task, no duplicate email is sent
- This applies across server restarts (tracked in memory during current session)

### Error Handling
- If a volunteer's email fails, the job continues processing other volunteers
- Failed emails are recorded and returned in the result
- Task processing continues even if one volunteer's email fails

### Database Queries
- Verifies task exists in database
- Verifies volunteer exists in database
- Fetches task assignments to find volunteer-task pairs
- Does NOT modify any task or volunteer data

## Integration with Brevo

- Uses the existing Brevo email API client ([src/lib/brevo.ts](../BREVO_EMAIL_API.md))
- Uses transactional email template (default ID: 1)
- Parameters passed to template (use Brevo `params` namespace, e.g. `{{params.volunteers_name}}`):
  - `volunteers_name` - Volunteer's full name
  - `task_name` - Task title
  - `due_date` - Task due date
  - `VOLUNTEER_NAME` - Volunteer's full name (legacy)
  - `TASK_TITLE` - Task title (legacy)
  - `DUE_DATE` - Task due date (legacy)
  - `TASK_ID` - Task ID
  - `VOLUNTEER_ID` - Volunteer ID

## Production Deployment

### Environment Variables Required

```env
BREVO_API_KEY=your_brevo_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Timing Considerations

- The cron job runs in **UTC timezone**
- Schedule times are interpreted as UTC
- For local time, adjust the schedule accordingly
  - EST (UTC-5): Add 5 hours to desired time
  - PST (UTC-8): Add 8 hours to desired time

### Server Startup

- Cron jobs initialize when the Next.js server starts
- `runOnStartup` is set to `false` to avoid email floods on restart
- To send immediately on startup, modify [src/lib/init-background-jobs.ts](src/lib/init-background-jobs.ts)

### Monitoring

Check server logs for execution status:

```bash
# View recent logs (example for typical Node.js deployment)
journalctl -u your-app -n 50
```

Look for entries with `[Task Reminder Job]` prefix.

## Troubleshooting

**"Scheduler not initialized"**
- Check that the app started correctly
- Verify no errors in startup logs
- Manually trigger via API to test

**Emails not being sent**
- Check `BREVO_API_KEY` environment variable is set
- Verify Brevo template ID exists (default: 1)
- Check database contains pending tasks and assignments
- Check volunteer email addresses are valid

**Duplicate emails being sent**
- Check the task status (should be "Pending")
- Verify the email tracking cache hasn't been cleared
- Check server didn't restart unexpectedly

**Jobs not running at scheduled time**
- Verify cron expression is correct
- Remember times are in UTC
- Check server is still running
- Check server time is accurate

## Testing

### Manual Trigger
```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'
```

### Check Status
```bash
curl http://localhost:3000/api/cron/status
```

### View Logs
Search for `[Task Reminder Job]` and `[Cron Jobs]` in server logs.
