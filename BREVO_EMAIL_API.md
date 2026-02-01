# Task Reminder Email API

This API endpoint sends task reminder emails to assigned volunteers using the **Brevo (Sendinblue)** transactional email service.

## Setup

### 1. Get Your Brevo API Key

1. Sign up at [Brevo.com](https://www.brevo.com)
2. Go to **Settings** > **SMTP & API**
3. Copy your **API Key**
4. Add it to your `.env.local` file:

```env
BREVO_API_KEY=your_brevo_api_key_here
```

### 2. Create a Transactional Email Template in Brevo

1. In Brevo Dashboard, go to **Campaigns** > **Transactional Email** > **Email Templates**
2. Create a new template with the following variables:
   - `{{params.VOLUNTEER_NAME}}` - Volunteer's full name
   - `{{params.TASK_TITLE}}` - Task title
   - `{{params.DUE_DATE}}` - Task due date
   - `{{params.TASK_ID}}` - Task ID
   - `{{params.VOLUNTEER_ID}}` - Volunteer ID

3. Note the **Template ID** from the template details (you'll use this in API calls)

### Example Template Structure

```html
<h2>Task Reminder</h2>
<p>Hi {{params.VOLUNTEER_NAME}},</p>
<p>This is a reminder about your upcoming task:</p>
<p><strong>{{params.TASK_TITLE}}</strong></p>
<p>Due Date: {{params.DUE_DATE}}</p>
<p>Please complete this task as soon as possible.</p>
```

## API Endpoint

### Send Task Reminder Email

**Endpoint:** `POST /api/send-task-reminder`

**Request Body:**

```json
{
  "taskId": 1,
  "volunteerId": 5,
  "volunteerEmail": "john@example.com",
  "volunteerName": "John Doe",
  "taskTitle": "Organize donation drive",
  "dueDate": "2026-02-14",
  "templateId": 1
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | number | Yes | ID of the task |
| `volunteerId` | number | Yes | ID of the volunteer |
| `volunteerEmail` | string | Yes | Email address of the volunteer |
| `volunteerName` | string | Yes | Full name of the volunteer |
| `taskTitle` | string | Yes | Title of the task |
| `dueDate` | string | Yes | Due date (any date format) |
| `templateId` | number | No | Brevo template ID (defaults to 1) |

**Success Response (200):**

```json
{
  "success": true,
  "messageId": "1234567890",
  "message": "Email successfully sent to john@example.com"
}
```

**Error Response (400/404/500):**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Check Email Sent Status

**Endpoint:** `GET /api/send-task-reminder?taskId=<id>&volunteerId=<id>`

**Response:**

```json
{
  "success": true,
  "emailSentToday": true
}
```

## Key Features

✅ **One Email Per Day:** The system tracks emails sent today and prevents duplicate sends  
✅ **Respects Task Status:** Stops sending emails once a task is marked as "Completed"  
✅ **Database Validation:** Verifies task and volunteer existence before sending  
✅ **Environment Variables:** Uses `BREVO_API_KEY` from environment configuration  
✅ **Transactional Templates:** Uses Brevo's template system with dynamic parameters  
✅ **Error Handling:** Comprehensive error responses with detailed messages  

## Implementation Files

- **API Route:** [src/app/api/send-task-reminder/route.ts](src/app/api/send-task-reminder/route.ts)
- **Brevo Client:** [src/lib/brevo.ts](src/lib/brevo.ts)
- **Email Tracking:** [src/lib/email-tracking.ts](src/lib/email-tracking.ts)

## Usage Example

```javascript
// Send task reminder email
const response = await fetch('/api/send-task-reminder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: 1,
    volunteerId: 5,
    volunteerEmail: 'john@example.com',
    volunteerName: 'John Doe',
    taskTitle: 'Organize donation drive',
    dueDate: '2026-02-14',
    templateId: 1
  })
});

const data = await response.json();
if (data.success) {
  console.log('Email sent:', data.messageId);
} else {
  console.log('Failed to send:', data.message);
}
```

## Behavior Rules

1. **Daily Limit:** Only one reminder email per volunteer per task per day
2. **Task Completion:** If task status is "Completed", no email is sent
3. **Validation:** Both task and volunteer must exist in the database
4. **Template Parameters:** All parameters are passed to the Brevo template
5. **Message Tracking:** Each successful send returns a Brevo message ID

## Production Notes

- The in-memory email tracking cache persists only during the current server session
- For persistent tracking across server restarts, consider storing records in the database
- Brevo has rate limits; check their documentation for limits on your plan
- Monitor API responses for delivery failures via Brevo Dashboard

## Troubleshooting

**"BREVO_API_KEY environment variable is not set"**
- Add `BREVO_API_KEY` to your `.env.local` file
- Restart your development server

**"Task not found" or "Volunteer not found"**
- Verify that the task and volunteer IDs exist in the database
- Check database connection is working

**"Email already sent today for this task"**
- This is expected behavior - one email per day per task
- Try again tomorrow or use a different date

**Email not received**
- Check the template ID is correct
- Verify email address is valid
- Check Brevo Dashboard for delivery status
