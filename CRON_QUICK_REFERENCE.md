# Cron Endpoint - Quick Reference Card

## Environment Variable Setup

```bash
# 1. Generate a secret key (run this once)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Copy the output and add to your .env.local (development):
CRON_SECRET_KEY=your_generated_key_here

# 3. Add the same to Render Dashboard:
# Settings → Environment → Add Variable
# Name: CRON_SECRET_KEY
# Value: your_generated_key_here
```

---

## Quick Test (Curl)

```bash
# Test locally
curl "http://localhost:3000/api/cron/run-reminders?secret=your-test-key"

# Test on Render
curl "https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY"
```

---

## Setup Cron Job (Choose One)

### EasyCron (Easiest)
1. Go to https://www.easycron.com/
2. Create account (free, no card required)
3. Add new cron job
4. **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY`
5. **Schedule:** `0 5 * * *` (5 AM daily)

### cron-job.org
1. Go to https://cron-job.org/en/
2. Create account (free)
3. Create cronjob
4. **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY`
5. **Schedule:** Daily at 5:00 AM

### GitHub Actions (Free + Private)
1. Create `.github/workflows/reminders.yml`:
```yaml
name: Daily Reminders
on:
  schedule:
    - cron: '0 5 * * *'
jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST "https://your-app.onrender.com/api/cron/run-reminders?secret=${{ secrets.CRON_SECRET_KEY }}"
```
2. Add `CRON_SECRET_KEY` to GitHub repo secrets

---

## Endpoint Responses

### ✅ Success
```json
{
  "success": true,
  "message": "Reminders sent successfully",
  "data": {
    "timestamp": "2026-02-08T10:30:45.123Z",
    "totalTasksProcessed": 5,
    "totalEmailsSent": 12,
    "totalEmailsFailed": 0,
    "durationMs": 2345
  }
}
```

### ❌ Wrong Secret
```json
{
  "success": false,
  "message": "Authentication failed: invalid secret key"
}
```

### ❌ Missing Secret
```json
{
  "success": false,
  "message": "Authentication failed: secret key is required"
}
```

---

## Monitoring

### View Logs in Render
Render Dashboard → Your Service → **Logs** tab

Search for: `[Cron Endpoint]`

Expected log:
```
[Cron Endpoint] Authenticated request received. Starting reminder job...
[Cron Endpoint] Job completed successfully in 2345ms. Tasks: 5, Emails sent: 12
```

---

## Security Checklist

- [ ] Generate a strong secret key (32+ characters)
- [ ] Add `CRON_SECRET_KEY` to Render environment variables
- [ ] Test endpoint locally before deploying
- [ ] Test endpoint on Render after deployment
- [ ] Set up external cron service
- [ ] Verify cron job executed successfully
- [ ] Monitor logs periodically
- [ ] Keep secret private (don't share in emails/Slack)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check secret key matches exactly in cron service |
| 500 Server Error | Verify `CRON_SECRET_KEY` exists in Render env vars |
| No emails sent | Check for pending tasks in database; check Brevo API |
| Slow execution | Expected on Render free tier (may take 10-30s to wake up) |

---

## What Happens When Endpoint Is Called

1. ✅ Validates the secret key (constant-time comparison for security)
2. ✅ Calls `processPendingTaskReminders()`
3. ✅ Fetches all pending tasks from database
4. ✅ For each task, gets assigned volunteers
5. ✅ Sends reminder emails via Brevo API
6. ✅ Returns detailed results (tasks processed, emails sent, failures)
7. ✅ Logs everything for monitoring

---

## Example: Calling from Node.js

```typescript
// Call the endpoint from your own code
import fetch from 'node-fetch';

async function triggerReminders(secretKey: string) {
  const response = await fetch(
    `https://your-app.onrender.com/api/cron/run-reminders?secret=${secretKey}`,
    { method: 'POST' }
  );
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`✅ Sent ${data.data.totalEmailsSent} emails`);
  } else {
    console.error('❌ Failed:', data.message);
  }
}

// Usage
triggerReminders(process.env.CRON_SECRET_KEY!);
```

---

## Next Steps

1. Generate secret key ✅
2. Add to Render environment ✅
3. Test with curl ✅
4. Set up external cron ✅
5. Monitor logs ✅
