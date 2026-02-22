/**
 * Scheduled task processor for sending task reminder emails
 * Fetches all pending tasks and sends reminder emails to assigned volunteers
 */

import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail, sendBrevoEmailWithHtml } from '@/lib/brevo';

// Use service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TaskReminderResult {
  taskId: number;
  taskTitle: string;
  emailsSent: number;
  emailsFailed: number;
  errors: Array<{
    volunteerId: number;
    email: string;
    error: string;
  }>;
}

export interface ScheduledJobResult {
  success: boolean;
  timestamp: string;
  totalTasksProcessed: number;
  totalEmailsSent: number;
  totalEmailsFailed: number;
  totalOverdueAlertsSent: number;
  taskResults: TaskReminderResult[];
  errors?: string[];
}

interface OverdueTaskAssignment {
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
    email: string | null;
  };
}

const DEFAULT_ADMIN_OVERDUE_EMAIL = 'lekhashreeyc@gmail.com';

/**
 * Resolve admin recipients for overdue alerts.
 * Priority order:
 * 1) ADMIN_ALERT_EMAILS (comma-separated)
 * 2) ADMIN_EMAIL (single)
 * 3) hardcoded fallback
 */
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

  return [DEFAULT_ADMIN_OVERDUE_EMAIL];
}

/**
 * Ensure the overdue tracking table exists (or fail gracefully if not accessible yet).
 */
async function ensureOverdueAlertsTableExists(): Promise<void> {
  try {
    const { error } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.warn('[Task Reminder Job] overdue_admin_alerts table not found, skipping admin alert tracking checks');
    }
  } catch (error) {
    console.warn('[Task Reminder Job] Unable to verify overdue_admin_alerts table:', error);
  }
}

/**
 * Check if an overdue alert was already sent today for a task/admin pair.
 */
async function hasOverdueAlertBeenSent(
  taskId: string,
  adminEmail: string
): Promise<boolean> {
  try {
    // Step 1: Get latest alert timestamp for this task/admin pair.
    const { data, error } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .select('alert_sent_date')
      .eq('task_id', taskId)
      .eq('admin_email', adminEmail)
      .eq('alert_sent', true)
      .order('alert_sent_date', { ascending: false })
      .limit(1);

    if (error && error.code === 'PGRST116') {
      return false;
    }

    if (error) {
      console.error('[Task Reminder Job] Error checking overdue alert status:', error);
      return false;
    }

    // Step 2: Compare latest sent date with today's UTC date.
    if (!data || data.length === 0) {
      return false;
    }

    const lastSentDate = new Date(data[0].alert_sent_date)
      .toISOString()
      .split('T')[0];
    const todayDate = new Date().toISOString().split('T')[0];

    return lastSentDate === todayDate;
  } catch (error) {
    console.error('[Task Reminder Job] Exception checking overdue alert status:', error);
    return false;
  }
}

/**
 * Record that an overdue alert has been sent.
 * Uses alert_sent_date as the daily tracking field (equivalent to last_admin_email_sent).
 */
async function recordOverdueAlertSent(
  taskId: string,
  volunteerId: string,
  adminEmail: string
): Promise<void> {
  try {
    const nowIso = new Date().toISOString();

    // Step 1: Try updating existing tracking row(s) for this task/admin pair.
    const { data: existingRows } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .select('id')
      .eq('task_id', taskId)
      .eq('admin_email', adminEmail)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const { error: updateError } = await supabaseServiceRole
        .from('overdue_admin_alerts')
        .update({
          alert_sent: true,
          alert_sent_date: nowIso,
          volunteer_id: volunteerId
        })
        .eq('task_id', taskId)
        .eq('admin_email', adminEmail);

      if (updateError) {
        console.error('[Task Reminder Job] Failed to update overdue alert tracking:', updateError);
      }
      return;
    }

    // Step 2: Insert new tracking row when none exists.
    const { error } = await supabaseServiceRole
      .from('overdue_admin_alerts')
      .insert({
        task_id: taskId,
        volunteer_id: volunteerId,
        admin_email: adminEmail,
        alert_sent: true,
        alert_sent_date: nowIso
      });

    if (error && error.code === 'PGRST116') {
      console.warn('[Task Reminder Job] overdue_admin_alerts table missing; unable to persist tracking');
      return;
    }

    if (error) {
      console.error('[Task Reminder Job] Failed to persist overdue alert tracking:', error);
    }
  } catch (error) {
    console.error('[Task Reminder Job] Exception while persisting overdue alert tracking:', error);
  }
}

/**
 * Build the required overdue admin email template.
 */
function buildOverdueAlertEmailHtml(
  taskTitle: string,
  dueDate: string,
  volunteerName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body>
  <p>Hello Admin,</p>
  <p>
    The task "${taskTitle}" assigned to ${volunteerName} was due on ${dueDate} and is still not completed.
  </p>
  <p>
    Please follow up with the assigned user to ensure the task is completed as soon as possible.
  </p>
  <p>
    Regards,<br />
    Task Management System
  </p>
</body>
</html>
  `.trim();
}

/**
 * Find all overdue tasks and notify admins once per overdue task.
 */
async function processOverdueTaskAdminAlerts(result: ScheduledJobResult): Promise<void> {
  // Step 1: Ensure tracking table is available (if not, we still try to send).
  await ensureOverdueAlertsTableExists();

  // Step 2: Fetch task assignments where task status is not completed.
  const { data: taskAssignments, error: assignmentsError } = await supabaseServiceRole
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

  if (assignmentsError) {
    const errorMsg = `Failed to fetch assignments for overdue alerting: ${assignmentsError.message}`;
    result.errors?.push(errorMsg);
    console.error('[Task Reminder Job]', errorMsg);
    return;
  }

  const typedAssignments = (taskAssignments ?? []) as unknown as OverdueTaskAssignment[];
  if (typedAssignments.length === 0) {
    return;
  }

  const todayString = new Date().toISOString().split('T')[0];

  // Step 3: Filter to overdue tasks (due date before today and status not completed).
  const overdueAssignments = typedAssignments.filter((assignment) => {
    const task = assignment.tasks;
    if (!task?.due_date) {
      return false;
    }

    const normalizedStatus = task.status?.toLowerCase().trim();
    if (normalizedStatus === 'completed') {
      return false;
    }

    const dueDateOnly = task.due_date.includes('T')
      ? task.due_date.split('T')[0]
      : task.due_date;

    return dueDateOnly < todayString;
  });

  if (overdueAssignments.length === 0) {
    return;
  }

  const adminEmails = getAdminAlertEmails();

  // Step 4: Group assignments by task so admin alert is sent only once per overdue task.
  const overdueByTask = new Map<string, OverdueTaskAssignment[]>();
  for (const assignment of overdueAssignments) {
    const existing = overdueByTask.get(assignment.tasks.id) || [];
    existing.push(assignment);
    overdueByTask.set(assignment.tasks.id, existing);
  }

  // Step 5: Send one alert per overdue task/admin pair.
  for (const [, taskAssignments] of overdueByTask) {
    const primaryAssignment = taskAssignments[0];
    const task = primaryAssignment.tasks;
    const dueDate = task.due_date || 'No due date';
    const assignedUsers = taskAssignments
      .map((item) => item.volunteers.full_name)
      .filter((name) => name && name.trim().length > 0);
    const assignedUserLabel = assignedUsers.length > 0
      ? [...new Set(assignedUsers)].join(', ')
      : 'Unassigned';
    const trackingVolunteerId = primaryAssignment.volunteer_id;

    for (const adminEmail of adminEmails) {
      try {
        const alreadySent = await hasOverdueAlertBeenSent(task.id, adminEmail);

        if (alreadySent) {
          continue;
        }

        const htmlContent = buildOverdueAlertEmailHtml(
          task.title,
          dueDate,
          assignedUserLabel
        );

        const messageId = await sendBrevoEmailWithHtml(
          adminEmail,
          'Overdue Task Alert – Immediate Attention Required',
          htmlContent
        );

        console.log(
          `[Task Reminder Job] Overdue admin alert queued (task=${task.id}, admin=${adminEmail}, messageId=${messageId})`
        );

        await recordOverdueAlertSent(
          task.id,
          trackingVolunteerId,
          adminEmail
        );

        result.totalOverdueAlertsSent++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors?.push(
          `Overdue alert failed for task ${task.id}, admin ${adminEmail}: ${errorMsg}`
        );
        console.error('[Task Reminder Job] Overdue alert send failure:', errorMsg);
      }
    }
  }
}

/**
 * Process all pending tasks and send reminder emails to assigned volunteers
 * @returns Job execution result with statistics
 */
export async function processPendingTaskReminders(): Promise<ScheduledJobResult> {
  const startTime = new Date();
  const result: ScheduledJobResult = {
    success: true,
    timestamp: startTime.toISOString(),
    totalTasksProcessed: 0,
    totalEmailsSent: 0,
    totalEmailsFailed: 0,
    totalOverdueAlertsSent: 0,
    taskResults: [],
    errors: []
  };

  try {
    console.log('[Task Reminder Job] Starting scheduled task reminder job...');

    // Get today's date for tracking
    const today = new Date().toISOString().split('T')[0];

    // Fetch all pending tasks
    const { data: pendingTasks, error: tasksError } = await supabaseServiceRole
      .from('tasks')
      .select('id, title, due_date, status')
      .eq('status', 'Pending');

    if (tasksError) {
      const errorMsg = `Failed to fetch pending tasks: ${tasksError.message}`;
      console.error(`[Task Reminder Job] ${errorMsg}`);
      result.success = false;
      result.errors?.push(errorMsg);
      return result;
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      console.log('[Task Reminder Job] No pending tasks found');
      return result;
    }

    console.log(
      `[Task Reminder Job] Found ${pendingTasks.length} pending tasks`
    );

    // Process each pending task
    for (const task of pendingTasks) {
      const taskResult: TaskReminderResult = {
        taskId: task.id,
        taskTitle: task.title,
        emailsSent: 0,
        emailsFailed: 0,
        errors: []
      };

      try {
        // Fetch all volunteers assigned to this task
        const { data: assignments, error: assignmentsError } = await supabaseServiceRole
          .from('task_assignments')
          .select('volunteer_id')
          .eq('task_id', task.id);

        if (assignmentsError) {
          console.error(
            `[Task Reminder Job] Error fetching assignments for task ${task.id}:`,
            assignmentsError
          );
          taskResult.errors.push({
            volunteerId: 0,
            email: '',
            error: `Failed to fetch assignments: ${assignmentsError.message}`
          });
          result.taskResults.push(taskResult);
          continue;
        }

        if (!assignments || assignments.length === 0) {
          console.log(
            `[Task Reminder Job] Task ${task.id} has no assigned volunteers`
          );
          result.taskResults.push(taskResult);
          continue;
        }

        // Check email tracking to prevent duplicates
        const volunteerIds = assignments.map(a => a.volunteer_id);
        const { data: sentToday, error: trackingError } = await supabaseServiceRole
          .from('email_tracking')
          .select('volunteer_id')
          .eq('task_id', task.id)
          .in('volunteer_id', volunteerIds)
          .gte('email_sent_date', `${today}T00:00:00Z`)
          .lt('email_sent_date', `${today}T23:59:59Z`);

        if (trackingError) {
          console.error(
            `[Task Reminder Job] Error checking email tracking:`,
            trackingError
          );
          // Continue anyway - better to send duplicate than skip
        }

        const sentTodaySet = new Set(sentToday?.map(s => s.volunteer_id) || []);

        // Send reminder email to each assigned volunteer (if not sent today)
        for (const assignment of assignments) {
          const volunteerId = assignment.volunteer_id;

          try {
            // Check if email was already sent today
            if (sentTodaySet.has(volunteerId)) {
              console.log(
                `[Task Reminder Job] Email already sent today for task ${task.id}, volunteer ${volunteerId}`
              );
              continue;
            }

            // Fetch volunteer details
            const { data: volunteer, error: volunteerError } = await supabaseServiceRole
              .from('volunteers')
              .select('id, full_name, email')
              .eq('id', volunteerId)
              .single();

            if (volunteerError || !volunteer) {
              throw new Error(
                `Volunteer ${volunteerId} not found: ${volunteerError?.message}`
              );
            }

            if (!volunteer.email) {
              console.log(
                `[Task Reminder Job] Volunteer ${volunteerId} has no email address`
              );
              continue;
            }

            // Send the reminder email
            const messageId = await sendTaskReminderEmail(
              task.id,
              volunteerId,
              volunteer.email,
              volunteer.full_name,
              task.title,
              task.due_date || 'No due date',
              1 // Use default template ID
            );

            // Record in database that email was sent
            const { error: insertError } = await supabaseServiceRole
              .from('email_tracking')
              .insert({
                task_id: task.id,
                volunteer_id: volunteerId,
                email_sent_date: new Date().toISOString(),
                brevo_message_id: messageId
              });

            if (insertError) {
              console.error(
                `[Task Reminder Job] Failed to record email tracking:`,
                insertError
              );
              // Continue - email was sent successfully
            }

            taskResult.emailsSent++;
            result.totalEmailsSent++;

            console.log(
              `[Task Reminder Job] Email sent for task ${task.id} to ${volunteer.email} (Message ID: ${messageId})`
            );
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            console.error(
              `[Task Reminder Job] Failed to send email for volunteer ${volunteerId}:`,
              errorMsg
            );

            // Get volunteer email for error record
            const { data: volunteer } = await supabaseServiceRole
              .from('volunteers')
              .select('email')
              .eq('id', volunteerId)
              .single();

            taskResult.emailsFailed++;
            result.totalEmailsFailed++;
            taskResult.errors.push({
              volunteerId,
              email: volunteer?.email || 'unknown',
              error: errorMsg
            });
          }
        }

        result.taskResults.push(taskResult);
        result.totalTasksProcessed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Task Reminder Job] Error processing task ${task.id}:`,
          errorMsg
        );

        taskResult.errors.push({
          volunteerId: 0,
          email: '',
          error: errorMsg
        });
        result.taskResults.push(taskResult);
      }
    }

    // Step 5: After volunteer reminders, process overdue task alerts for admins.
    await processOverdueTaskAdminAlerts(result);

    const duration = (Date.now() - startTime.getTime()) / 1000;
    console.log(
      `[Task Reminder Job] Job completed in ${duration}s. Sent ${result.totalEmailsSent} reminder emails, ${result.totalOverdueAlertsSent} overdue admin alerts, ${result.totalEmailsFailed} failed.`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Task Reminder Job] Fatal error:', errorMsg);
    result.success = false;
    result.errors?.push(`Fatal error: ${errorMsg}`);
  }

  return result;
}

/**
 * Get summary statistics for the last job run
 */
export function getJobSummary(result: ScheduledJobResult): string {
  return `
Task Reminder Job Summary:
- Timestamp: ${result.timestamp}
- Tasks Processed: ${result.totalTasksProcessed}
- Reminder Emails Sent: ${result.totalEmailsSent}
- Overdue Alerts Sent: ${result.totalOverdueAlertsSent}
- Emails Failed: ${result.totalEmailsFailed}
- Status: ${result.success ? 'Success' : 'Failed'}
${result.errors && result.errors.length > 0 ? `- Errors: ${result.errors.join(', ')}` : ''}
  `.trim();
}
