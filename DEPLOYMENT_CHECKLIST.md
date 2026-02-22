# Cron Endpoint Deployment Checklist

## ✅ What Was Created

### 1. **Secure Cron Endpoint**
   - **File:** [src/app/api/cron/run-reminders/route.ts](src/app/api/cron/run-reminders/route.ts)
   - Supports GET and POST requests
   - Validates secret key using constant-time comparison (prevents timing attacks)
   - Returns detailed execution metrics
   - Production-ready error handling and logging

### 2. **Cron Client Utility**
   - **File:** [src/lib/cron-client.ts](src/lib/cron-client.ts)
   - Call endpoint from your own code with automatic retries
   - Exponential backoff for reliability
   - TypeScript types and comprehensive error handling
   - Useful for integration with other services

### 3. **Documentation**
   - **Setup Guide:** [CRON_ENDPOINT_SETUP.md](CRON_ENDPOINT_SETUP.md) - Complete setup with all cron services
   - **Quick Reference:** [CRON_QUICK_REFERENCE.md](CRON_QUICK_REFERENCE.md) - Fast implementation guide
   - **Examples:** [CRON_ENDPOINT_EXAMPLES.md](CRON_ENDPOINT_EXAMPLES.md) - 10+ real-world examples
   - **This Checklist:** Step-by-step deployment guide

---

## 📋 Step-by-Step Deployment

### Step 1: Generate Secret Key (2 minutes)

```bash
# Run this command to generate a strong random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output (e.g., "a1b2c3d4e5f6...")
```

**Save this key somewhere safe.** You'll need it for the next steps.

### Step 2: Add to Your Local Environment (1 minute)

Add to `.env.local`:
```bash
CRON_SECRET_KEY=your_generated_key_from_step_1
```

### Step 3: Test Locally (2 minutes)

Start your development server:
```bash
npm run dev
```

Test the endpoint in another terminal:
```bash
curl "http://localhost:3000/api/cron/run-reminders?secret=your_generated_key_from_step_1"
```

Expected response:
```json
{
  "success": true,
  "message": "Reminders sent successfully",
  "data": {
    "totalTasksProcessed": ...,
    "totalEmailsSent": ...
  }
}
```

### Step 4: Deploy to Render (3 minutes)

1. Go to your **Render Dashboard** → Your Service
2. Click **Settings** → **Environment**
3. Add new variable:
   - **Name:** `CRON_SECRET_KEY`
   - **Value:** Your key from Step 1
4. Click **Save** and wait for deployment
5. Confirm deployment succeeded in the **Logs** tab

### Step 5: Test Remote Endpoint (2 minutes)

```bash
curl "https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_KEY"
```

**Note:** First call may take 10-30 seconds while Render wakes up the free tier instance.

### Step 6: Choose a Cron Service (5-10 minutes)

Pick ONE:

#### Option A: **EasyCron** (Easiest, Recommended)
1. Go to https://www.easycron.com/
2. Sign up (free, no credit card)
3. Click **Add Cron Job**
4. Fill in:
   - **Cron Expression:** `0 5 * * *` (5 AM UTC daily)
   - **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_KEY`
5. Save!

#### Option B: **cron-job.org** (Also easy)
1. Go to https://cron-job.org/en/
2. Sign up (free)
3. Click **Create Cronjob**
4. **Title:** Task Reminders
5. **URL:** `https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_KEY`
6. **Schedule:** Daily at 5:00 AM UTC

#### Option C: **GitHub Actions** (Free if you have GitHub)
See [CRON_ENDPOINT_SETUP.md](CRON_ENDPOINT_SETUP.md) under "GitHub Actions"

### Step 7: Verify Setup (5 minutes)

1. **Wait for next scheduled time** or manually trigger the cron job in the service's dashboard
2. **Check Render logs** for execution:
   ```
   [Cron Endpoint] Authenticated request received. Starting reminder job...
   [Cron Endpoint] Job completed successfully in XXXX ms
   ```
3. **Verify emails were sent** in your database or Brevo account

---

## 🔒 Security Checklist

- [ ] Generated a strong secret key (32+ characters)
- [ ] Secret is in Render environment variables (not in code)
- [ ] Secret is NOT shared via email or Slack
- [ ] Only you know the secret key
- [ ] Endpoint is HTTPS (automatic on Render)
- [ ] Constant-time comparison prevents timing attacks
- [ ] Error messages don't leak information

---

## 🚀 Quick Test Commands

### Local Testing
```bash
# Test success
curl "http://localhost:3000/api/cron/run-reminders?secret=your-test-key"

# Test with wrong secret
curl "http://localhost:3000/api/cron/run-reminders?secret=wrong-key"

# Test without secret
curl "http://localhost:3000/api/cron/run-reminders"
```

### Production Testing (Render)
```bash
# Replace with your actual endpoint and key
curl "https://your-app.onrender.com/api/cron/run-reminders?secret=YOUR_SECRET_KEY"
```

### Using the Client Library
```typescript
import { triggerReminders } from '@/lib/cron-client';

const result = await triggerReminders({
  url: 'https://your-app.onrender.com/api/cron/run-reminders',
  secret: process.env.CRON_SECRET_KEY!,
  timeout: 60000,
  retries: 3
});

console.log(`Sent ${result.response.data?.totalEmailsSent} emails`);
```

---

## 📊 Expected Behavior

### Successful Execution
```
Time: 5:00 AM UTC Daily
Response: 200 OK
{
  "success": true,
  "message": "Reminders sent successfully",
  "data": {
    "totalTasksProcessed": 3,
    "totalEmailsSent": 8,
    "totalEmailsFailed": 0,
    "durationMs": 2345
  }
}
Logs: [Cron Endpoint] Job completed successfully in 2345ms
```

### Common Scenarios
| Scenario | What Happens |
|----------|--------------|
| No pending tasks | Still returns success, 0 tasks processed |
| Some emails fail | Returns success with failure count in response |
| Server sleeping | First request wakes it up (10-30s delay), then runs |
| Wrong secret | Returns 401 Unauthorized immediately |
| Service down | Cron service retries automatically |

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check secret matches exactly in cron service |
| 500 Server Error | Verify CRON_SECRET_KEY in Render env vars |
| Slow response | Expected on Render free tier (wake-up delay) |
| No emails sent | Check if pending tasks exist; check Brevo API |
| Cron never runs | Verify cron service has correct URL and timezone |
| Endpoint not found | Make sure you've deployed (pushed to Render) |

See [CRON_ENDPOINT_SETUP.md](CRON_ENDPOINT_SETUP.md) for full troubleshooting guide.

---

## 📚 Documentation Structure

```
CRON_ENDPOINT_SETUP.md         ← Complete setup + all cron services
├── Environment setup
├── API details
├── 7 different cron services (EasyCron, GitHub Actions, etc.)
├── Security best practices
├── Testing instructions
└── Troubleshooting guide

CRON_QUICK_REFERENCE.md        ← Fast reference card
├── Quick setup
├── Test commands
├── Cron service snippets
└── Common issues

CRON_ENDPOINT_EXAMPLES.md      ← Real-world code examples
├── 10 different use cases
├── CLI script
├── Integration examples
├── Health checks
└── Testing code

This file (DEPLOYMENT_CHECKLIST.md) ← Step-by-step guide
```

---

## ✨ Key Features

✅ **Secure**
- Secret key authentication
- Constant-time comparison (prevents timing attacks)
- Environment variables (not hardcoded)
- HTTPS only (on Render)

✅ **Reliable**
- Automatic retry with exponential backoff
- Detailed logging for monitoring
- Error responses with actionable messages
- Timeout handling

✅ **Production-Ready**
- Full TypeScript support
- Comprehensive error handling
- Detailed response metadata
- Performance monitoring (duration tracking)

✅ **Easy to Use**
- Simple GET/POST requests
- Query parameters or JSON body
- 7+ external cron service integrations
- Client library for programmatic use

---

## 📞 Need Help?

1. **Check the logs** in Render Dashboard → Logs tab
2. **Search for `[Cron Endpoint]`** errors in logs
3. **Read troubleshooting** in [CRON_ENDPOINT_SETUP.md](CRON_ENDPOINT_SETUP.md)
4. **Review examples** in [CRON_ENDPOINT_EXAMPLES.md](CRON_ENDPOINT_EXAMPLES.md)
5. **Check secret key** matches exactly (case-sensitive)
6. **Verify database** has pending tasks

---

## 🎯 Success Criteria

You'll know everything is working when:

- [ ] Endpoint tested locally ✅
- [ ] Secret key added to Render env vars ✅
- [ ] Cron service configured and running ✅
- [ ] First scheduled execution completes ✅
- [ ] Emails received by volunteers ✅
- [ ] Logs show successful execution ✅
- [ ] Second scheduled execution also succeeds ✅

---

## Next Steps After Deployment

1. **Monitor Logs** - Check daily for successes/failures
2. **Set Retention** - Review logs weekly to catch issues
3. **Rotate Secret** - Change secret key every 6 months
4. **Scale Up** - Consider paid Render plan if email volume increases
5. **Add Alerts** - Set up monitoring in EasyCron/cron-job.org

---

## Files Created

```
src/app/api/cron/run-reminders/route.ts  ← Main endpoint (196 lines)
src/lib/cron-client.ts                   ← Client utility (300+ lines)
CRON_ENDPOINT_SETUP.md                   ← Full guide
CRON_QUICK_REFERENCE.md                  ← Quick reference
CRON_ENDPOINT_EXAMPLES.md                ← Code examples
DEPLOYMENT_CHECKLIST.md                  ← This file
```

---

**You're all set! Follow the deployment steps above and your reminder emails will run automatically.** 🚀
