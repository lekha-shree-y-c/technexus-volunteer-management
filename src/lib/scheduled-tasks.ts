/**
 * Scheduled task processor for sending task reminder emails
 * Fetches all pending tasks and sends reminder emails to assigned volunteers
 */

import { supabase } from '@/lib/supabase';
import { sendTaskReminderEmail } from '@/lib/brevo';
import {
  hasEmailBeenSentToday,
  recordEmailSent
} from '@/lib/email-tracking';

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

    // Fetch all pending tasks
    const { data: pendingTasks, error: tasksError } = await supabase
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
        const { data: assignments, error: assignmentsError } = await supabase
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

        // Send reminder email to each assigned volunteer
        for (const assignment of assignments) {
          const volunteerId = assignment.volunteer_id;

          try {
            // Check if email was already sent today
            if (hasEmailBeenSentToday(task.id, volunteerId)) {
              console.log(
                `[Task Reminder Job] Email already sent today for task ${task.id}, volunteer ${volunteerId}`
              );
              continue;
            }

            // Fetch volunteer details
            const { data: volunteer, error: volunteerError } = await supabase
              .from('volunteers')
              .select('id, full_name, email')
              .eq('id', volunteerId)
              .single();

            if (volunteerError || !volunteer) {
              throw new Error(
                `Volunteer ${volunteerId} not found: ${volunteerError?.message}`
              );
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

            // Record that email was sent
            recordEmailSent(task.id, volunteerId, messageId);

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
            const { data: volunteer } = await supabase
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
