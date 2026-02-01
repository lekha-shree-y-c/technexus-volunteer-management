# Quick Start: Scheduled Task Reminders

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Update database schema** (add email column to volunteers):
   ```sql
   ALTER TABLE volunteers ADD COLUMN email TEXT;
   ```

3. **Environment variables** (`.env.local`):
   ```env
   BREVO_API_KEY=your_brevo_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the app** - cron jobs initialize automatically:
   ```bash
   npm run dev
   ```

## How It Works

- **Daily**: Runs automatically at 8:00 AM UTC
- **Pending Tasks**: Fetches all tasks with status "Pending"
- **Send Emails**: Sends reminder emails to assigned volunteers
- **One Per Day**: Only one email per volunteer per task per day
- **Skip Completed**: Automatically skips completed tasks

## API Endpoints

### Manually Trigger (Test)
```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'
```

### Check Status
```bash
curl http://localhost:3000/api/cron/status
```

### Reschedule
```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "reschedule", "schedule": "0 9 * * *"}'
```

## Change Daily Schedule

Edit `src/lib/init-background-jobs.ts`:

```typescript
// Change time (cron format: minute hour day-of-month month day-of-week)
initializeCronJobs('0 9 * * *', false);  // 9 AM UTC
```

Common schedules:
- `0 8 * * *` - 8 AM UTC daily
- `0 9 * * 1-5` - 9 AM UTC weekdays only
- `0 12 * * 0` - 12 PM UTC Sundays only

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/scheduled-tasks.ts` | Core task processor |
| `src/lib/cron-jobs.ts` | Scheduler management |
| `src/lib/init-background-jobs.ts` | Startup initialization |
| `src/components/BackgroundJobsInitializer.tsx` | Server startup hook |
| `src/app/api/cron/trigger/route.ts` | API endpoints |
| `SCHEDULED_TASKS.md` | Full documentation |

## Logging

Watch for logs with these prefixes:
- `[Task Reminder Job]` - Job execution
- `[Cron Jobs]` - Scheduler status

Example:
```
[Task Reminder Job] Starting scheduled task reminder job...
[Task Reminder Job] Found 3 pending tasks
[Task Reminder Job] Email sent for task 1 to john@example.com
[Task Reminder Job] Job completed in 2.5s. Sent 5 emails, 0 failed.
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Emails not sending | Check `BREVO_API_KEY` environment variable |
| "Task not found" | Verify task ID exists in database |
| "Volunteer not found" | Verify volunteer ID and email in database |
| Duplicate emails | Expected behavior if task not marked "Completed" |
| Scheduler not running | Check server startup logs for errors |

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Database schema updated (email column added)
- [ ] Environment variables set
- [ ] Server starts without errors
- [ ] API `/api/cron/status` returns `running: true`
- [ ] Manual trigger works via `POST /api/cron/trigger`
- [ ] Logs show `[Task Reminder Job]` entries
- [ ] Emails received by test volunteers

## Documentation

- **[SCHEDULED_TASKS.md](SCHEDULED_TASKS.md)** - Complete reference
- **[BREVO_EMAIL_API.md](BREVO_EMAIL_API.md)** - Email API setup
- **[SCHEDULED_TASKS_IMPLEMENTATION.md](SCHEDULED_TASKS_IMPLEMENTATION.md)** - Implementation details

## Next Steps

1. Update your Brevo transactional email template with the task reminder variables
2. Populate volunteer email addresses in the database
3. Create pending tasks and assign them to volunteers
4. Test with manual API trigger: `POST /api/cron/trigger`
5. Deploy to production

---

**No breaking changes** - All existing functionality remains unchanged!
