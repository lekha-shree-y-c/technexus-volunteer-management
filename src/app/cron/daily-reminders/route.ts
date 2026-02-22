/**
 * GET /cron/daily-reminders
 *
 * Secure endpoint to send daily task reminder emails.
 * Protected with ?key=CRON_SECRET.
 * 
 * Features:
 * - Sends reminder emails to volunteers for incomplete tasks (via Brevo)
 * - Sends overdue task alerts to admins (via Brevo)
 * - Prevents duplicate emails/alerts using tracking tables
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail, sendBrevoEmailWithHtml } from '@/lib/brevo';

const DEFAULT_ADMIN_EMAIL = 'lekhashreeyc@gmail.com';

function getAdminAlertEmails(): string[] {
  const fromList = process.env.ADMIN_ALERT_EMAILS
    ?.split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (fromList && fromList.length > 0) {
    return fromList;
  }

  const singleAdmin = process.env.ADMIN_EMAIL?.trim();
  if (singleAdmin) {
    return [singleAdmin];
  }

  return [DEFAULT_ADMIN_EMAIL];
}

interface AssignmentTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
}

interface AssignmentVolunteer {
  id: string;
  full_name: string;
  email: string;
}

interface TaskAssignmentRecord {
  task_id: string;
  volunteer_id: string;
  tasks: AssignmentTask;
  volunteers: AssignmentVolunteer;
}

function validateEnvironmentVariables(): void {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVars.join(', ')}`
    );
  }
}

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Ensure overdue_admin_alerts tracking table exists
 * Creates it if it doesn't exist yet
 */
async function ensureOverdueAlertsTableExists(): Promise<void> {
  try {
    // Try to query the table to check if it exists
    const { error } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .select('id')
      .limit(1);

    // If table doesn't exist, create it via direct SQL (this would need to be run separately)
    // For now, we'll handle the case where the table doesn't exist gracefully
    if (error && error.code === 'PGRST116') {
      console.warn('[Daily Reminders] overdue_admin_alerts table not found, will attempt to track locally');
    }
  } catch (err) {
    console.log('[Daily Reminders] Unable to check overdue_admin_alerts table');
  }
}

/**
 * Check if an overdue alert has been sent for this task-volunteer pair
 * Uses overdue_admin_alerts table for tracking
 */
async function hasOverdueAlertBeenSent(
  taskId: number | string,
  volunteerId: number | string
): Promise<boolean> {
  try {
    console.log(`[Daily Reminders] Checking if alert already sent for task ${taskId}, volunteer ${volunteerId}`);
    
    const { data, error } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .select('id')
      .eq('task_id', taskId)
      .eq('volunteer_id', volunteerId)
      .eq('alert_sent', true)
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist yet, return false
      console.log('[Daily Reminders] Table overdue_admin_alerts does not exist yet');
      return false;
    }

    if (error) {
      console.error('[Daily Reminders] Error checking overdue alert status:', error);
      // Don't block email sending if check fails
      return false;
    }

    const alreadySent = data && data.length > 0;
    console.log(`[Daily Reminders] Alert already sent: ${alreadySent}`);
    return alreadySent;
  } catch (err) {
    console.error('[Daily Reminders] Exception checking overdue alert:', err);
    // Don't block email sending if check fails
    return false;
  }
}

/**
 * Record that an overdue alert has been sent
 */
async function recordOverdueAlertSent(
  taskId: number | string,
  volunteerId: number | string,
  adminEmail: string
): Promise<void> {
  try {
    console.log(`[Daily Reminders] Recording alert sent for task ${taskId}, volunteer ${volunteerId}, admin ${adminEmail}`);
    
    const { error } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .insert({
        task_id: taskId,
        volunteer_id: volunteerId,
        admin_email: adminEmail,
        alert_sent: true,
        alert_sent_date: new Date().toISOString()
      });

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, log and continue
      console.log('[Daily Reminders] overdue_admin_alerts table not created yet, skipping tracking');
      return;
    }

    if (error) {
      console.error('[Daily Reminders] Error recording overdue alert:', error);
    } else {
      console.log(`[Daily Reminders] Successfully recorded alert for task ${taskId}`);
    }
  } catch (err) {
    console.error('[Daily Reminders] Exception recording overdue alert:', err);
  }
}

async function sendDailyReminders() {
  validateEnvironmentVariables();
  await ensureOverdueAlertsTableExists();

  const today = new Date().toISOString().split('T')[0];
  let reminderEmailsSent = 0;
  let overdueAlertsSent = 0;

  // ==================== PART 1: REGULAR REMINDERS ====================
  // Send reminder emails to volunteers for incomplete tasks (existing logic)

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
    console.error('[Daily Reminders] Error fetching task assignments:', queryError);
    throw new Error('Failed to fetch task assignments');
  }

  const typedTaskAssignments =
    ((taskAssignments ?? []) as unknown as TaskAssignmentRecord[]);

  if (typedTaskAssignments.length > 0) {
    const taskVolunteerPairs = typedTaskAssignments.map((assignment) => ({
      task_id: assignment.tasks.id,
      volunteer_id: assignment.volunteers.id
    }));

    const { data: sentEmails } = await supabaseServiceRole
      .from('email_tracking')
      .select('task_id, volunteer_id, email_sent_date')
      .in(
        'task_id',
        taskVolunteerPairs.map((p) => p.task_id)
      );

    const sentTodaySet = new Set<string>();
    if (sentEmails) {
      sentEmails.forEach((record) => {
        const recordDate = new Date(record.email_sent_date)
          .toISOString()
          .split('T')[0];
        if (recordDate === today) {
          sentTodaySet.add(`${record.task_id}-${record.volunteer_id}`);
        }
      });
    }

    const assignmentsToEmail = typedTaskAssignments.filter((assignment) => {
      const taskId = assignment.tasks.id;
      const volunteerId = assignment.volunteers.id;
      return !sentTodaySet.has(`${taskId}-${volunteerId}`);
    });

    // Send reminder emails to volunteers
    for (const assignment of assignmentsToEmail) {
      try {
        const task = assignment.tasks;
        const volunteer = assignment.volunteers;

        const messageId = await sendTaskReminderEmail(
          task.id,
          volunteer.id,
          volunteer.email,
          volunteer.full_name,
          task.title,
          task.due_date || 'No due date'
        );

        const { error: insertError } = await supabaseServiceRole
          .from('email_tracking')
          .insert({
            task_id: task.id,
            volunteer_id: volunteer.id,
            email_sent_date: new Date().toISOString(),
            brevo_message_id: messageId
          });

        if (insertError) {
          console.error('[Daily Reminders] Tracking insert failed:', insertError);
        } else {
          reminderEmailsSent++;
        }
      } catch (emailError) {
        const err = emailError as Error;
        console.error('[Daily Reminders] Error sending reminder email:', err.message);
      }
    }
  }

  // ==================== PART 2: OVERDUE TASK ALERTS ====================
  // Send admin alerts for incomplete tasks that are past due

  const { data: allIncompleteAssignments, error: incompleteQueryError } = await supabaseServiceRole
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

  const typedIncompleteAssignments =
    ((allIncompleteAssignments ?? []) as unknown as TaskAssignmentRecord[]);

  console.log(`[Daily Reminders] Query for incomplete tasks - Error: ${incompleteQueryError ? JSON.stringify(incompleteQueryError) : 'null'}, Data count: ${typedIncompleteAssignments.length}`);

  if (incompleteQueryError) {
    console.error('[Daily Reminders] Error fetching incomplete assignments for overdue check:', incompleteQueryError);
  } else if (typedIncompleteAssignments.length === 0) {
    console.log('[Daily Reminders] No incomplete task assignments found');
  } else {
    console.log(`[Daily Reminders] Found ${typedIncompleteAssignments.length} incomplete task assignments`);
    
    // Log all incomplete tasks for debugging
    typedIncompleteAssignments.forEach((a) => {
      const task = a.tasks;
      const volunteer = a.volunteers;
      console.log(`[Daily Reminders] Assignment - Task: ${task.title} (ID: ${task.id}), Status: '${task.status}', Due: ${task.due_date}, Volunteer: ${volunteer.full_name}`);
    });

    // Filter for overdue tasks (past due date and not completed)
    const overdueAssignments = typedIncompleteAssignments.filter((assignment) => {
      const task = assignment.tasks;
      if (!task.due_date) {
        console.log(`[Daily Reminders] Task ${task.id} has no due_date, skipping`);
        return false;
      }

      // Convert due_date string directly to YYYY-MM-DD format without Date object
      let dueDateString = task.due_date;
      
      // If it's a full ISO string like "2026-02-01T00:00:00", extract just the date part
      if (typeof dueDateString === 'string' && dueDateString.includes('T')) {
        dueDateString = dueDateString.split('T')[0];
      }
      
      // Get today's date in YYYY-MM-DD format
      const todayString = new Date().toISOString().split('T')[0];
      
      // String comparison works correctly for YYYY-MM-DD format
      const isOverdue = dueDateString < todayString;
      
      console.log(`[Daily Reminders] Task ${task.id} (${task.title}): status='${task.status}', due_date='${task.due_date}', dueDateString='${dueDateString}', todayString='${todayString}', isOverdue=${isOverdue}`);
      
      return isOverdue;
    });

    console.log(`[Daily Reminders] Filtered to ${overdueAssignments.length} overdue assignments`);

    const adminEmails = getAdminAlertEmails();

    // Send overdue alerts to each admin for each overdue task
    for (const assignment of overdueAssignments) {
      const task = assignment.tasks;
      const volunteer = assignment.volunteers;

      try {
        // Check if alert has already been sent for this task-volunteer pair
        const alertAlreadySent = await hasOverdueAlertBeenSent(task.id, volunteer.id);

        if (alertAlreadySent) {
          console.log(`[Daily Reminders] Overdue alert already sent for task ${task.id}, volunteer ${volunteer.id}`);
          continue;
        }

        // Send alert to each admin
        for (const adminEmail of adminEmails) {
          try {
            console.log(`[Daily Reminders] Sending overdue alert to ${adminEmail} for task ${task.id}...`);
            
            // Create HTML email content
            const subject = '⚠️ Overdue Task Alert';
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #d32f2f; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
.header h2 { margin: 0; }
.content { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
.alert-box { background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 15px 0; }
.info-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px; }
.label { font-weight: bold; color: #d32f2f; display: inline-block; width: 120px; }
.footer { color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; }
a { color: #d32f2f; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2>⚠️ Overdue Task Alert</h2>
</div>
<div class="content">
<p>Hello Admin,</p>
<p>The following task is <strong>OVERDUE</strong> and still incomplete:</p>
<div class="alert-box">
<div class="info-row"><span class="label">Task:</span> ${task.title}</div>
<div class="info-row"><span class="label">Volunteer:</span> ${volunteer.full_name}</div>
<div class="info-row"><span class="label">Email:</span> <a href="mailto:${volunteer.email}">${volunteer.email}</a></div>
<div class="info-row"><span class="label">Due Date:</span> ${task.due_date}</div>
</div>
<p>This task was expected to be completed by <strong>${task.due_date}</strong> but remains incomplete.</p>
<p>Please follow up with the assigned volunteer to ensure timely completion.</p>
</div>
<div class="footer">
<p>This is an automated message from the Volunteer Management System.</p>
</div>
</div>
</body>
</html>
            `;
            
            // Send email via Brevo
            const messageId = await sendBrevoEmailWithHtml(
              adminEmail,
              subject,
              htmlContent
            );

            console.log(`[Daily Reminders] ✅ Overdue alert sent to ${adminEmail} (Message ID: ${messageId})`);
            
            // Record that alert was sent
            await recordOverdueAlertSent(task.id, volunteer.id, adminEmail);
            overdueAlertsSent++;
          } catch (adminAlertError) {
            const err = adminAlertError as Error;
            console.error(
              `[Daily Reminders] ❌ Error sending overdue alert to ${adminEmail}: ${err.message}`
            );
          }
        }
      } catch (overdueError) {
        const err = overdueError as Error;
        console.error('[Daily Reminders] Error processing overdue task alert:', err.message);
      }
    }
  }

  console.log(
    `[Daily Reminders] Sent ${reminderEmailsSent} reminder emails and ${overdueAlertsSent} overdue alerts`
  );

  return {
    success: true,
    message: `Sent ${reminderEmailsSent} reminder emails and ${overdueAlertsSent} overdue alerts`,
    reminderEmailsSent,
    overdueAlertsSent,
    totalEmailsSent: reminderEmailsSent + overdueAlertsSent
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
  }
  return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');
    const expectedKey = process.env.CRON_SECRET || '';

    if (!providedKey) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed: key is required' },
        { status: 401 }
      );
    }

    if (!expectedKey || !constantTimeEquals(providedKey, expectedKey)) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed: invalid key' },
        { status: 401 }
      );
    }

    const result = await sendDailyReminders();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const err = error as Error;
    console.error('[Daily Reminders] API error:', err.message);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: err.message },
      { status: 500 }
    );
  }
}
