/**
 * Scheduled task processor for sending task reminder emails
 * Fetches all pending tasks and sends reminder emails to assigned volunteers
 */

import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail } from '@/lib/brevo';

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
  taskResults: TaskReminderResult[];
  errors?: string[];
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

    const duration = (Date.now() - startTime.getTime()) / 1000;
    console.log(
      `[Task Reminder Job] Job completed in ${duration}s. Sent ${result.totalEmailsSent} emails, ${result.totalEmailsFailed} failed.`
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
- Emails Sent: ${result.totalEmailsSent}
- Emails Failed: ${result.totalEmailsFailed}
- Status: ${result.success ? 'Success' : 'Failed'}
${result.errors && result.errors.length > 0 ? `- Errors: ${result.errors.join(', ')}` : ''}
  `.trim();
}
