# Secure Cron Endpoint Setup Guide

This guide shows how to set up and use the secure cron endpoint for triggering reminder emails on your Render backend.

## 1. Environment Setup

### Add the Secret Key to Your Environment

Add this to your `.env.local` file (development) and Render environment variables (production):

```bash
# Generate a strong random secret key (recommendation: 32+ characters)
# You can generate one using:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

CRON_SECRET_KEY=your_super_secret_key_here_min_32_characters
```

### Generating a Strong Secret Key

Run this command to generate a cryptographically secure random key:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL (if available)
openssl rand -hex 32

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Setting in Render Dashboard

1. Go to your Render service dashboard
2. Navigate to **Environment** or **Environment Variables**
3. Add a new variable:
   - Name: `CRON_SECRET_KEY`
   - Value: (your generated secret from above)
4. Deploy or restart your service

---

## 2. API Endpoint Details

**Endpoint:** `https://your-app.onrender.com/api/cron/run-reminders`

**Methods:** Both GET and POST are supported

### Request Examples

#### GET Request (Simplest)
```bash
curl "https://your-app.onrender.com/api/cron/run-reminders?secret=your_secret_key"
```

#### POST Request with Query Parameter
```bash
curl -X POST "https://your-app.onrender.com/api/cron/run-reminders?secret=your_secret_key"
```

#### POST Request with JSON Body
```bash
curl -X POST "https://your-app.onrender.com/api/cron/run-reminders" \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_secret_key"}'
```

### Success Response (200 OK)
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

### Error Response - Invalid Secret (401 Unauthorized)
```json
{
  "success": false,
  "message": "Authentication failed: invalid secret key"
}
```

### Error Response - Missing Secret (401 Unauthorized)
```json
{
  "success": false,
  "message": "Authentication failed: secret key is required"
}
```

### Error Response - Server Error (500)
```json
{
  "success": false,
  "message": "Job execution failed",
  "error": "Details of the error"
}
```

---

## 3. Setting Up External Cron Services

### Option A: Render Cron Jobs (Free, Built-in)

If your app is on Render, you can use their free cron job feature!

1. Go to your Render service dashboard
2. Click on **Settings**
3. Scroll to **Cron Jobs**
4. Click **Add Cron Job**
5. Configure:
   - **Name:** `Send Task Reminders`
   - **Command:** 
     ```bash
     curl -X POST "https://api.render.com/deploy/YOUR_SERVICE_ID?key=YOUR_RENDER_DEPLOY_KEY"
     ```
   - **Schedule:** `0 17 * * *` (5 PM daily on your timezone)

**Note:** For Render's built-in cron, you'd want to redeploy. Instead, use external services below.

### Option B: EasyCron (Free, No Credit Card)

1. Go to https://www.easycron.com/
2. Create a free account
3. Click **Add Cron Job**
4. Configure:
   - **Cron Expression:** `0 5 * * *` (5 AM UTC daily)
   - **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY`
   - **HTTP Method:** GET or POST
   - **Execution Notifications:** Get email alerts if it fails

### Option C: cron-job.org (Free)

1. Go to https://cron-job.org/en/
2. Click **Create Cronjob**
3. Configure:
   - **Title:** `Task Reminder Emails`
   - **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY`
   - **Execution Schedule:** 
     - **Interval:** Daily
     - **Time:** 5:00 AM (or your preferred time)
   - **Save**

### Option D: AWS EventBridge (Paid Alternative)

For production environments, AWS EventBridge offers reliable scheduling:

```bash
# Create a rule that triggers your endpoint
aws events put-rule \
  --name daily-reminder-job \
  --schedule-expression "cron(0 5 * * ? *)" \
  --state ENABLED

# Create an HTTP target
aws events put-targets \
  --rule daily-reminder-job \
  --targets "Id"="1","HttpParameters"="{\"PathParameterValues\":[]," \
    "\"HeaderParameters\":{\"Authorization\":\"Bearer YOUR_SECRET_KEY\"}," \
    "\"QueryStringParameters\":{\"secret\":\"YOUR_SECRET_KEY\"}}"," \
    "RoleArn"="arn:aws:iam::ACCOUNT_ID:role/EventBridgeRole," \
    "Arn"="https://your-app.onrender.com/api/cron/run-reminders," \
    "HttpParameters"="{}"
```

### Option E: GitHub Actions (Free)

Create `.github/workflows/daily-reminders.yml`:

```yaml
name: Daily Task Reminders

on:
  schedule:
    - cron: '0 5 * * *'  # 5 AM UTC daily

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger reminder job
        run: |
          curl -X POST "https://your-app.onrender.com/api/cron/run-reminders?secret=${{ secrets.CRON_SECRET_KEY }}"
        env:
          CRON_SECRET_KEY: ${{ secrets.CRON_SECRET_KEY }}
```

**Note:** Add `CRON_SECRET_KEY` to your GitHub repository secrets.

### Option F: Zapier (Free tier available)

1. Go to https://zapier.com
2. Create a new Zap
3. **Trigger:** Schedule (pick your time)
4. **Action:** Webhooks by Zapier → POST
5. Configure:
   - **URL:** `https://your-app.onrender.com/api/cron/run-reminders`
   - **Method:** POST
   - **Data:**
     ```json
     {
       "secret": "YOUR_SECRET_KEY"
     }
     ```

### Option G: IFTTT (Free)

1. Create an IFTTT account
2. Create a new Applet
3. **If:** Time & Date → Every day at (set your time)
4. **Then:** Webhooks → Make a web request
5. Configure:
   - **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY`
   - **Method:** GET
   - **Headers:** (leave empty)
   - **Body:** (leave empty)

---

## 4. Security Best Practices

✅ **DO:**
- Use a strong, randomly generated secret key (32+ characters)
- Store the secret in environment variables, NOT in code
- Rotate your secret key every 3-6 months
- Monitor logs for failed authentication attempts
- Use HTTPS only (all services above use HTTPS)
- Keep the endpoint URL and secret private

❌ **DON'T:**
- Commit the secret to version control
- Reuse the same secret across environments
- Use weak passwords like "secret123"
- Share the endpoint URL publicly
- Log or expose the secret in responses

### Rotating Your Secret Key

When you need to update your secret:

1. Generate a new secret key
2. Update `CRON_SECRET_KEY` in Render environment variables
3. Wait for deployment to complete
4. Update all external cron services with the new key
5. Monitor logs to ensure successful execution

---

## 5. Testing the Endpoint Locally

### During Development

```bash
# Set the secret in your .env.local
CRON_SECRET_KEY=test-secret-key-12345

# Run your development server
npm run dev

# Test the endpoint in another terminal
curl "http://localhost:3000/api/cron/run-reminders?secret=test-secret-key-12345"
```

### Test with Wrong Secret
```bash
# Should return 401 Unauthorized
curl "http://localhost:3000/api/cron/run-reminders?secret=wrong-key"
```

### Test without Secret
```bash
# Should return 401 Unauthorized
curl "http://localhost:3000/api/cron/run-reminders"
```

---

## 6. Monitoring & Logging

The endpoint logs all activity:

- ✅ Successful executions with email counts
- ⚠️ Failed authentication attempts
- ❌ Job execution errors

### View Logs in Render

1. Go to your Render service dashboard
2. Click the **Logs** tab
3. Search for `[Cron Endpoint]` to see all endpoint activity

### Set Up Email Alerts (Optional)

Using EasyCron or cron-job.org, enable notifications to get emailed if:
- The cron job fails to execute
- The HTTP response is an error
- The job takes longer than expected

---

## 7. Troubleshooting

### "Cron service not configured"
**Solution:** Add `CRON_SECRET_KEY` to your Render environment variables and redeploy.

### "Authentication failed: invalid secret key"
**Solution:** Ensure the secret key in your cron service exactly matches the `CRON_SECRET_KEY` in Render.

### "Cold start delays"
**Issue:** Render free tier sleeps after 15 min. Your cron job may take 10-30 seconds to wake up.
**Solution:** Consider upgrading to a paid Render plan, or accept the delay.

### No emails being sent
1. Check Render logs for execution errors
2. Verify pending tasks exist in your database
3. Verify volunteer emails are valid
4. Check Brevo account balance / API limits
5. Review the `processPendingTaskReminders()` function logs

### Cron job running but no task reminders sent
Check:
- Are there any pending tasks? (Query your tasks table)
- Are volunteers assigned to those tasks?
- Is Brevo API working correctly?
- Check response data for `totalEmailsSent` count

---

## 8. Expected Behavior

### Typical Successful Run
```
[Cron Endpoint] Authenticated request received. Starting reminder job...
[Cron Endpoint] Job completed successfully in 2345ms. Tasks: 5, Emails sent: 12
```

### Response indicates success with details:
```json
{
  "success": true,
  "data": {
    "totalTasksProcessed": 5,
    "totalEmailsSent": 12,
    "totalEmailsFailed": 0
  }
}
```

---

## Summary

| Step | What to Do |
|------|-----------|
| 1 | Generate a strong random secret key |
| 2 | Add `CRON_SECRET_KEY` to Render environment variables |
| 3 | Choose a cron service (EasyCron, cron-job.org, GitHub Actions, etc.) |
| 4 | Test the endpoint with `curl` |
| 5 | Monitor logs in Render dashboard |
| 6 | Set up email alerts for failures |
| 7 | Schedule the endpoint to run daily |

**You're all set!** Your reminder emails will now run automatically even if Render puts your app to sleep.
