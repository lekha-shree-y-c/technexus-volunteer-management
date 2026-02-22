import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail } from '@/lib/brevo';

/**
 * Validates that all required environment variables are set
 * @throws Error if any required environment variable is missing
 */
function validateEnvironmentVariables(): void {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY
  };

  const missingVars: string[] = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing environment variables: ${missingVars.join(', ')}. Please ensure these are configured in your .env.local file.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

// Initialize Supabase with service role key (server-side only)
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TaskReminder {
  task_id: string;
  volunteer_id: string;
  volunteer_email: string;
  volunteer_name: string;
  task_title: string;
  due_date: string;
}

interface EmailTrackingRecord {
  task_id: string;
  volunteer_id: string;
  email_sent_date: string;
}

interface TaskAssignmentRecord {
  task_id: string;
  volunteer_id: string;
  tasks: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
  };
  volunteers: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * Sends task reminder emails to volunteers with incomplete task assignments
 * - Only sends one email per task per volunteer per day
 * - Stops sending once task is marked as completed
 * - Uses Brevo API for transactional emails
 * @returns Email send results
 */
async function sendTaskReminders() {
  // Validate all environment variables on each call
  validateEnvironmentVariables();

  // Get today's date for email tracking
  const today = new Date().toISOString().split('T')[0];

  // Step 1: Find all incomplete tasks with their assignments and volunteer emails
  // Only fetch tasks where status is NOT 'Completed'
  const { data: taskAssignments, error: queryError } = await supabaseServiceRole
    .from('task_assignments')
    .select(
      `
      task_id,
      volunteer_id,
      tasks!inner(id, title, status, due_date),
      volunteers!inner(id, full_name, email)
      `
    )
    .neq('tasks.status', 'Completed');

  if (queryError) {
    console.error('Error fetching task assignments:', queryError);
    throw new Error('Failed to fetch task assignments');
  }

  const typedTaskAssignments =
    ((taskAssignments ?? []) as unknown as TaskAssignmentRecord[]);

  const numTasksFetched = typedTaskAssignments.length;
  console.log(`Fetched: ${numTasksFetched} tasks`);

  if (typedTaskAssignments.length === 0) {
    return {
      success: true,
      message: 'No incomplete task assignments found',
      emailsSent: 0,
      results: []
    };
  }

  // Step 2: Check email tracking to avoid duplicate emails on the same day
  const taskVolunteerPairs = typedTaskAssignments.map((assignment) => ({
    task_id: assignment.tasks.id,
    volunteer_id: assignment.volunteers.id
  }));

  const { data: sentEmails, error: trackingError } = await supabaseServiceRole
    .from('email_tracking')
    .select('task_id, volunteer_id, email_sent_date')
    .in(
      'task_id',
      taskVolunteerPairs.map(p => p.task_id)
    );

  if (trackingError) {
    console.error('Error fetching email tracking:', trackingError);
    // Continue anyway - this is not critical
  }

  const sentTodaySet = new Set<string>();
  if (sentEmails) {
    (sentEmails as EmailTrackingRecord[]).forEach((record) => {
      const recordDate = new Date(record.email_sent_date)
        .toISOString()
        .split('T')[0];
      if (recordDate === today) {
        sentTodaySet.add(`${record.task_id}-${record.volunteer_id}`);
      }
    });
  }

  // Step 3: Filter assignments that haven't received an email today
  const assignmentsToEmail = typedTaskAssignments.filter((assignment) => {
    const taskId = assignment.tasks.id;
    const volunteerId = assignment.volunteers.id;
    return !sentTodaySet.has(`${taskId}-${volunteerId}`);
  });

  const numEmailsAttempted = assignmentsToEmail.length;
  console.log(`Attempting: ${numEmailsAttempted} emails`);

  if (assignmentsToEmail.length === 0) {
    return {
      success: true,
      message: 'All task assignments have already received emails today',
      emailsSent: 0,
      results: []
    };
  }

  // Step 4: Send emails and track them
  const emailResults: Array<{
    success: boolean;
    task_id: string;
    volunteer_id: string;
    error?: string;
  }> = [];

  for (const assignment of assignmentsToEmail) {
    try {
      const task = assignment.tasks;
      const volunteer = assignment.volunteers;

      // Send email via Brevo
      const messageId = await sendTaskReminderEmail(
        task.id,
        volunteer.id,
        volunteer.email,
        volunteer.full_name,
        task.title,
        task.due_date || 'No due date'
      );

      // Track the email sent
      const { error: insertError } = await supabaseServiceRole
        .from('email_tracking')
        .insert({
          task_id: task.id,
          volunteer_id: volunteer.id,
          email_sent_date: new Date().toISOString(),
          brevo_message_id: messageId
        });

      if (insertError) {
        console.error('Error recording email tracking:', insertError);
        emailResults.push({
          success: false,
          task_id: task.id,
          volunteer_id: volunteer.id,
          error: 'Email sent but tracking failed'
        });
      } else {
        emailResults.push({
          success: true,
          task_id: task.id,
          volunteer_id: volunteer.id
        });
      }
    } catch (emailError) {
      const error = emailError as Error;
      console.error('Error sending email:', error.message);
      const task = assignment.tasks;
      const volunteer = assignment.volunteers;
      emailResults.push({
        success: false,
        task_id: task.id,
        volunteer_id: volunteer.id,
        error: error.message
      });
    }
  }

  // Count successful emails
  const successCount = emailResults.filter(r => r.success).length;

  console.log(`Sent: ${successCount}/${emailResults.length} emails`);

  return {
    success: true,
    message: `Sent ${successCount} reminder emails`,
    emailsSent: successCount,
    totalAttempted: emailResults.length,
    results: emailResults
  };
}

/**
 * POST /api/task-reminder
 * 
 * Sends daily reminder emails to volunteers with incomplete task assignments.
 * Scheduled to run at 5:20 PM IST (11:50 AM UTC) via cron job.
 * Also triggers one email per task per volunteer per day (if not already sent today).
 */
export async function POST(request: NextRequest) {
  try {
    const result = await sendTaskReminders();
    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('Task reminder API error:', err.message);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/task-reminder
 * 
 * Testing endpoint to trigger daily reminder email sending.
 * Sends the same reminders as POST but for development/testing purposes.
 * Scheduled to run at 5:20 PM IST (11:50 AM UTC) via cron job.
 */
export async function GET(request: NextRequest) {
  try {
    const result = await sendTaskReminders();
    return NextResponse.json({
      ...result,
      note: 'Daily reminder email job (scheduled 5:20 PM IST)'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Task reminder API error:', err.message);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
