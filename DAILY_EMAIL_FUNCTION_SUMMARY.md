# Daily Task Email Function - Summary

## ✅ What Was Created

### 1. Supabase Edge Function
**Location:** `supabase/functions/daily-task-email/index.ts`

**Features:**
- ✅ Fetches all incomplete tasks (status != "Completed")
- ✅ Retrieves assigned volunteers with email addresses
- ✅ Sends personalized reminder emails via Brevo SMTP API
- ✅ Automatically skips completed tasks
- ✅ Returns detailed logs of all email operations
- ✅ Built with Deno for Edge runtime compatibility
- ✅ Includes proper error handling and CORS support

**Email Template Includes:**
- Task title
- Task description
- Due date (formatted)
- Task status
- Personalized greeting with volunteer name
- Professional HTML styling

### 2. Documentation Files

- **README.md** - Comprehensive guide with all details
- **DEPLOYMENT.md** - Quick deployment steps and commands
- **test-function.sh** - Automated test script

## 🚀 Quick Deployment Steps

```bash
# 1. Login to Supabase
npx supabase login

# 2. Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Set Brevo API key
npx supabase secrets set BREVO_API_KEY=your_brevo_api_key

# 4. Deploy the function
npx supabase functions deploy daily-task-email

# 5. Test it
npx supabase functions invoke daily-task-email
```

## ⚙️ Configuration Needed

### 1. Update Sender Email (Required!)
Edit `supabase/functions/daily-task-email/index.ts` around line 200:

```typescript
sender: {
  name: "Volunteer Management System",
  email: "your-verified-email@yourdomain.com", // ← Change this!
},
```

**Important:** This email must be verified in your Brevo account.

### 2. Schedule Daily Execution

**Option A - Supabase pg_cron (Recommended):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-task-email-reminder',
  '0 9 * * *',  -- 9 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-task-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  );
  $$
);
```

**Option B - External Cron Service:**
Use cron-job.org or similar to POST to:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-task-email`

## 📊 Response Format

```json
{
  "total_incomplete_tasks": 5,
  "emails_sent": 8,
  "emails_skipped": 2,
  "emails_failed": 0,
  "logs": [
    {
      "task_id": 1,
      "task_title": "Setup event booth",
      "volunteer_name": "John Doe",
      "volunteer_email": "john@example.com",
      "status": "sent"
    },
    {
      "task_id": 2,
      "task_title": "Prepare materials",
      "volunteer_name": "Jane Smith",
      "volunteer_email": "N/A",
      "status": "skipped",
      "reason": "No email address"
    }
  ]
}
```

## 🔍 How It Works

1. **Fetch Tasks:** Queries all tasks where `status != "Completed"`
2. **Get Assignments:** For each task, fetches assigned volunteers and their emails
3. **Build Email:** Creates personalized HTML email with task details
4. **Send via Brevo:** Uses Brevo SMTP API to send emails
5. **Skip Logic:** Automatically skips:
   - Tasks with no assigned volunteers
   - Volunteers without email addresses
   - Already completed tasks
6. **Return Logs:** Provides detailed report of all operations

## 🧪 Testing

### Run Test Script
```bash
cd supabase/functions/daily-task-email
./test-function.sh
```

### Manual Test
```bash
npx supabase functions invoke daily-task-email
```

### View Logs
```bash
npx supabase functions logs daily-task-email --tail
```

## 📋 Checklist

- [ ] Deploy function to Supabase
- [ ] Set BREVO_API_KEY secret
- [ ] Update sender email in code
- [ ] Verify sender email in Brevo dashboard
- [ ] Test function manually
- [ ] Schedule daily execution (pg_cron or external)
- [ ] Monitor first few runs
- [ ] Check email delivery in Brevo dashboard

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing BREVO_API_KEY | `npx supabase secrets set BREVO_API_KEY=your_key` |
| Sender not verified | Verify email in Brevo → Senders & IP |
| No emails received | Check spam folder, verify volunteer has email |
| Function errors | View logs: `npx supabase functions logs daily-task-email` |

## 📚 Documentation Links

- [Full README](supabase/functions/daily-task-email/README.md)
- [Quick Deployment Guide](supabase/functions/daily-task-email/DEPLOYMENT.md)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Brevo API Docs](https://developers.brevo.com/)

## 🎯 Key Features

✅ Edge-compatible (Deno runtime)  
✅ Automatic task status checking  
✅ Personalized HTML emails  
✅ Comprehensive error handling  
✅ Detailed logging and reporting  
✅ Skips completed tasks automatically  
✅ Production-ready with CORS support  
✅ Easy to schedule and automate  

## 📝 Notes

- The function only sends emails for tasks with `status != "Completed"`
- Volunteers must have an email address in the database
- Once a task is marked as "Completed", no more emails will be sent
- The sender email in Brevo must be verified before sending
- All API keys are stored securely in Supabase secrets
- Function logs are available for debugging and monitoring

---

**Next Steps:** Follow the deployment guide to get the function running!
