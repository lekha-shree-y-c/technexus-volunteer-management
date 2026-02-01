# Scheduled Task Reminder Implementation - Summary

## Overview

A complete daily scheduled job system has been implemented to automatically send task reminder emails to assigned volunteers once per day. The system is entirely backend-based with no UI modifications.

## Files Created

### Core Scheduling
1. **[src/lib/scheduled-tasks.ts](src/lib/scheduled-tasks.ts)**
   - Processes all pending tasks and sends reminder emails
   - Fetches pending tasks from database
   - Sends emails to assigned volunteers
   - Returns detailed execution statistics

2. **[src/lib/cron-jobs.ts](src/lib/cron-jobs.ts)**
   - Manages the cron job scheduler using `node-cron`
   - Initializes daily schedule (default: 8 AM UTC)
   - Supports manual triggering and runtime rescheduling
   - Tracks scheduler state

3. **[src/lib/init-background-jobs.ts](src/lib/init-background-jobs.ts)**
   - Initializes background jobs on server startup
   - Configures the daily schedule

### Server Integration
4. **[src/components/BackgroundJobsInitializer.tsx](src/components/BackgroundJobsInitializer.tsx)**
   - Server component that triggers initialization on app startup
   - Zero UI impact - renders nothing

### API Endpoints
5. **[src/app/api/cron/trigger/route.ts](src/app/api/cron/trigger/route.ts)**
   - `POST /api/cron/trigger` - Manually execute the job
   - `GET /api/cron/status` - Check scheduler status
   - Supports reschedule action

### Documentation
6. **[SCHEDULED_TASKS.md](SCHEDULED_TASKS.md)**
   - Complete guide for the scheduled task system
   - API documentation
   - Configuration instructions
   - Troubleshooting guide

## Files Modified

1. **[package.json](package.json)**
   - Added `node-cron@^3.0.2` dependency

2. **[schema.sql](schema.sql)**
   - Added `email TEXT` column to volunteers table

3. **[src/app/layout.tsx](src/app/layout.tsx)**
   - Added `BackgroundJobsInitializer` component
   - No visible UI changes

## How It Works

### Daily Execution
- Automatically runs at **8:00 AM UTC** every day
- Fetches all tasks with `status = 'Pending'`
- For each task, finds all assigned volunteers
- Sends reminder emails via Brevo API
- Prevents duplicate emails (one per volunteer per task per day)

### Duplicate Prevention
- Uses in-memory cache to track sent emails
- Only sends one email per volunteer per task per day
- Resets daily for new send attempts

### Task Status Respect
- Automatically skips tasks with `status = 'Completed'`
- Validates task exists in database before sending
- Gracefully handles missing tasks or volunteers

### Error Handling
- Individual volunteer email failures don't stop the job
- Failed emails are logged and reported
- Job continues processing other volunteers and tasks

## Configuration

The schedule can be changed in [src/lib/init-background-jobs.ts](src/lib/init-background-jobs.ts):

```typescript
// Change schedule time (cron format)
initializeCronJobs('0 9 * * *', false);  // 9 AM UTC

// Run on startup (for testing)
initializeCronJobs('0 8 * * *', true);   // Run immediately + schedule
```

## Database Integration

The system works with the existing Supabase setup:
- Reads from `tasks` table (filters by status)
- Reads from `task_assignments` table (finds volunteer-task pairs)
- Reads from `volunteers` table (gets volunteer names and emails)

**Note**: The `volunteers.email` column was added to [schema.sql](schema.sql)

## API Usage

### Manually Trigger the Job
```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'
```

### Check Scheduler Status
```bash
curl http://localhost:3000/api/cron/status
```

### Reschedule the Job
```bash
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "reschedule", "schedule": "0 9 * * *"}'
```

## Logging

All operations are logged with prefixes:
- `[Task Reminder Job]` - Scheduled task execution logs
- `[Cron Jobs]` - Cron scheduler logs

## Key Features

✅ **Automatic Daily Execution** - Runs without manual intervention  
✅ **Pending Tasks Only** - Processes only non-completed tasks  
✅ **Duplicate Prevention** - One email per volunteer per task per day  
✅ **Backend Only** - No UI changes or new user-facing features  
✅ **Database Validated** - Verifies tasks and volunteers exist  
✅ **Brevo Integration** - Uses existing email API client  
✅ **Error Resilient** - Continues on individual failures  
✅ **Manually Triggerable** - Can be run via API on-demand  
✅ **Dynamically Reschedulable** - Change schedule at runtime  
✅ **Detailed Statistics** - Returns execution metrics  

## Deployment Notes

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure environment variables are set:
   ```env
   BREVO_API_KEY=your_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. Update database schema to add email column:
   ```sql
   ALTER TABLE volunteers ADD COLUMN email TEXT;
   ```

4. Deploy as normal - cron jobs initialize on startup

## Testing

### Quick Test
```bash
# Trigger manually
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'

# Check status
curl http://localhost:3000/api/cron/status
```

### Check Logs
Look for `[Task Reminder Job]` entries in server output.

## No Breaking Changes

- ✅ No existing functionality modified
- ✅ No UI changes
- ✅ No existing API routes changed
- ✅ All new code in separate files
- ✅ Uses existing Brevo integration
- ✅ Uses existing Supabase connection
