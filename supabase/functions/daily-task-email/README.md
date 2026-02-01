# Daily Task Email - Supabase Edge Function

This Supabase Edge Function sends daily email reminders to volunteers about their assigned incomplete tasks using the Brevo SMTP API.

## Features

- ✅ Fetches all incomplete tasks (status != "Completed")
- ✅ Retrieves assigned volunteers and their email addresses
- ✅ Sends personalized email reminders with task details
- ✅ Skips completed tasks automatically
- ✅ Provides detailed logs of sent, skipped, and failed emails
- ✅ Uses Brevo SMTP API for reliable email delivery
- ✅ Built with Deno for Edge runtime compatibility

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Brevo API Key** added to Supabase secrets

3. **Verified sender email** in Brevo account

## Environment Variables Required

The function needs these environment variables set in Supabase:

- `SUPABASE_URL` - Automatically provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided by Supabase
- `BREVO_API_KEY` - Your Brevo API key (must be set manually)

## Deployment Steps

### Step 1: Login to Supabase CLI

```bash
npx supabase login
```

### Step 2: Link Your Project

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to your Supabase dashboard
- Open your project
- The URL will be: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or find it in Settings → General

### Step 3: Set the Brevo API Key Secret

```bash
npx supabase secrets set BREVO_API_KEY=your_actual_brevo_api_key_here
```

Verify the secret was set:
```bash
npx supabase secrets list
```

### Step 4: Deploy the Function

```bash
npx supabase functions deploy daily-task-email
```

### Step 5: Verify Deployment

Check if the function is deployed:
```bash
npx supabase functions list
```

## Testing the Function

### Test via Command Line

```bash
npx supabase functions invoke daily-task-email
```

### Test via HTTP Request

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-task-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key (found in Settings → API)

## Response Format

The function returns a JSON response with detailed logs:

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

## Scheduling the Function

### Option 1: Using Supabase Cron (Recommended)

Create a cron job in your Supabase database to trigger the function daily:

```sql
-- Create the cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run daily at 9:00 AM UTC
SELECT cron.schedule(
  'daily-task-email-reminder',
  '0 9 * * *',  -- Every day at 9:00 AM UTC
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

**Important:** Replace:
- `YOUR_PROJECT_REF` with your actual project reference
- `YOUR_SERVICE_ROLE_KEY` with your actual service role key

To view scheduled cron jobs:
```sql
SELECT * FROM cron.job;
```

To unschedule:
```sql
SELECT cron.unschedule('daily-task-email-reminder');
```

### Option 2: Using External Cron Services

Use services like:
- **Cron-job.org** - Free cron job scheduler
- **EasyCron** - Cron job service
- **GitHub Actions** - Run on schedule via workflows

Configure them to make a POST request to:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-task-email
```

With header:
```
Authorization: Bearer YOUR_ANON_KEY
```

### Option 3: Using Vercel Cron (if using Next.js on Vercel)

Create an API route in your Next.js app:

```typescript
// app/api/cron/daily-email/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/daily-task-email`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  return Response.json(data);
}
```

Then configure in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/daily-email",
    "schedule": "0 9 * * *"
  }]
}
```

## Email Customization

### Update Sender Email

In [index.ts](index.ts), line ~200, update the sender email:

```typescript
sender: {
  name: "Volunteer Management System",
  email: "your-verified-email@yourdomain.com", // Use your verified Brevo sender
},
```

**Important:** The sender email must be verified in your Brevo account.

### Customize Email Template

The HTML email template is in the `htmlContent` variable. Modify it to match your branding:
- Colors
- Logo
- Footer text
- Styling

## Troubleshooting

### Error: "Missing BREVO_API_KEY"

Make sure you set the secret:
```bash
npx supabase secrets set BREVO_API_KEY=your_key
```

### Error: "Sender email not verified"

1. Go to your Brevo dashboard
2. Navigate to Senders & IP
3. Add and verify your sender email address
4. Update the `sender.email` in the function code

### No emails received

1. Check Brevo dashboard for email logs
2. Verify the volunteer has an email address in the database
3. Check spam/junk folders
4. Review the function logs:
   ```bash
   npx supabase functions logs daily-task-email
   ```

### Function times out

If you have many tasks/volunteers, consider:
- Batching email sends
- Using a queue system
- Optimizing database queries

## Monitoring

### View Function Logs

```bash
npx supabase functions logs daily-task-email --tail
```

### Check Email Delivery in Brevo

1. Login to Brevo dashboard
2. Go to Statistics → Email
3. View delivery rates and bounces

## Local Development

### Run Locally

```bash
npx supabase functions serve daily-task-email --env-file .env.local
```

Create `.env.local`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BREVO_API_KEY=your_brevo_api_key
```

### Test Locally

```bash
curl -X POST 'http://localhost:54321/functions/v1/daily-task-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Security Notes

- Never commit API keys to version control
- Use Supabase secrets for sensitive data
- The service role key should only be used server-side
- Consider rate limiting for production use

## Support

For issues or questions:
1. Check the function logs
2. Review Brevo API documentation
3. Verify environment variables are set correctly
