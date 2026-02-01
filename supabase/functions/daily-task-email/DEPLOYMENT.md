# Quick Deployment Guide - Daily Task Email Function

## Prerequisites Checklist

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Brevo API key ready
- [ ] Verified sender email in Brevo account

## Deployment Commands

### 1. Login to Supabase
```bash
npx supabase login
```

### 2. Link Your Project
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref at: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 3. Set Brevo API Key
```bash
npx supabase secrets set BREVO_API_KEY=your_actual_brevo_api_key_here
```

### 4. Update Sender Email (Important!)
Edit `supabase/functions/daily-task-email/index.ts` around line 200:
```typescript
sender: {
  name: "Volunteer Management System",
  email: "your-verified-email@yourdomain.com", // ← Update this!
},
```

### 5. Deploy Function
```bash
npx supabase functions deploy daily-task-email
```

### 6. Test Function
```bash
npx supabase functions invoke daily-task-email
```

## Schedule Daily Execution

### Option A: Supabase pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily at 9 AM UTC
SELECT cron.schedule(
  'daily-task-email-reminder',
  '0 9 * * *',
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

**Replace:**
- `YOUR_PROJECT_REF` - Your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` - Your service role key (Settings → API)

### Option B: External Cron Service

Use [cron-job.org](https://cron-job.org) or similar:

**URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-task-email`

**Method:** POST

**Header:**
```
Authorization: Bearer YOUR_ANON_KEY
```

**Schedule:** Daily at your preferred time

## Verify Deployment

Check deployed functions:
```bash
npx supabase functions list
```

View logs:
```bash
npx supabase functions logs daily-task-email
```

Check secrets:
```bash
npx supabase secrets list
```

## Test via cURL

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-task-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Expected Response

```json
{
  "total_incomplete_tasks": 3,
  "emails_sent": 5,
  "emails_skipped": 1,
  "emails_failed": 0,
  "logs": [...]
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing BREVO_API_KEY" | Run: `npx supabase secrets set BREVO_API_KEY=your_key` |
| "Sender not verified" | Verify sender email in Brevo dashboard |
| No emails sent | Check function logs: `npx supabase functions logs daily-task-email` |
| Function not found | Redeploy: `npx supabase functions deploy daily-task-email` |

## Updating the Function

After making changes to `index.ts`:

```bash
npx supabase functions deploy daily-task-email
```

No need to redeploy for README changes.

## Next Steps

1. ✅ Deploy the function
2. ✅ Test it manually
3. ✅ Schedule it with pg_cron or external service
4. ✅ Monitor logs for the first few days
5. ✅ Check Brevo dashboard for email delivery stats

---

For detailed documentation, see [README.md](README.md)
