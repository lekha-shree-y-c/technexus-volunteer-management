/**
 * Cron job scheduler for periodic task reminder emails and volunteer status updates
 * Runs once per day at a specified time
 */

import cron from 'node-cron';
import { processPendingTaskReminders, getJobSummary } from '@/lib/scheduled-tasks';
import { updateVolunteerStatuses, getStatusJobSummary } from '@/lib/volunteer-status-updater';

// Store the cron job instances for lifecycle management
let reminderCronJob: cron.ScheduledTask | null = null;
let statusCronJob: cron.ScheduledTask | null = null;

/**
 * Initialize the cron job scheduler
 * Runs daily at 5:20 PM IST (11:50 AM UTC) by default for reminders
 * Runs daily at 12:00 AM UTC for volunteer status updates
 * @param scheduleTime - Cron expression for reminders (default: "50 11 * * *" = 5:20 PM IST / 11:50 AM UTC)
 * @param runOnStartup - Whether to run the jobs immediately on initialization
 */
export function initializeCronJobs(
  scheduleTime: string = '50 11 * * *',
  runOnStartup: boolean = false
): void {
  // Don't initialize if already running
  if (reminderCronJob || statusCronJob) {
    console.log('[Cron Jobs] Scheduler already initialized');
    return;
  }

  try {
    console.log('[Cron Jobs] Initializing cron job scheduler...');

    // Create the cron job for task reminders
    reminderCronJob = cron.schedule(scheduleTime, async () => {
      console.log('[Cron Jobs] Executing scheduled task reminder job...');
      try {
        const result = await processPendingTaskReminders();
        console.log('[Cron Jobs]', getJobSummary(result));
      } catch (error) {
        console.error('[Cron Jobs] Error executing reminder job:', error);
      }
    });

    console.log(
      `[Cron Jobs] Task reminder job scheduled: ${scheduleTime} (5:20 PM IST / 11:50 AM UTC)`
    );

    // Create the cron job for volunteer status updates (runs at midnight UTC)
    statusCronJob = cron.schedule('0 0 * * *', async () => {
      console.log('[Cron Jobs] Executing scheduled volunteer status update job...');
      try {
        const result = await updateVolunteerStatuses();
        console.log('[Cron Jobs]', getStatusJobSummary(result));
      } catch (error) {
        console.error('[Cron Jobs] Error executing status update job:', error);
      }
    });

    console.log(
      '[Cron Jobs] Volunteer status update job scheduled: 0 0 * * * (12:00 AM UTC daily)'
    );

    // Run immediately on startup if requested
    if (runOnStartup) {
      console.log('[Cron Jobs] Running jobs on startup...');
      
      // Run reminder job
      processPendingTaskReminders()
        .then((result) => {
          console.log('[Cron Jobs] Startup reminder job completed');
          console.log('[Cron Jobs]', getJobSummary(result));
        })
        .catch((error) => {
          console.error('[Cron Jobs] Error running startup reminder job:', error);
        });

      // Run status update job
      updateVolunteerStatuses()
        .then((result) => {
          console.log('[Cron Jobs] Startup status update job completed');
          console.log('[Cron Jobs]', getStatusJobSummary(result));
        })
        .catch((error) => {
          console.error('[Cron Jobs] Error running startup status update job:', error);
        });
    }
  } catch (error) {
    console.error('[Cron Jobs] Failed to initialize cron jobs:', error);
  }
}

/**
 * Stop the cron job scheduler
 */
export function stopCronJobs(): void {
  if (reminderCronJob) {
    reminderCronJob.stop();
    reminderCronJob = null;
    console.log('[Cron Jobs] Reminder scheduler stopped');
  }
  if (statusCronJob) {
    statusCronJob.stop();
    statusCronJob = null;
    console.log('[Cron Jobs] Status update scheduler stopped');
  }
}

/**
 * Check if cron jobs are running
 */
export function isCronJobsRunning(): boolean {
  return reminderCronJob !== null || statusCronJob !== null;
}

/**
 * Manually trigger the task reminder job
 * Useful for testing or manual execution
 */
export async function manuallyTriggerTaskReminderJob(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('[Cron Jobs] Manual trigger of task reminder job');
    const result = await processPendingTaskReminders();
    return {
      success: result.success,
      message: getJobSummary(result)
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    console.error('[Cron Jobs] Manual trigger failed:', errorMsg);
    return {
      success: false,
      message: `Failed to execute job: ${errorMsg}`
    };
  }
}

/**
 * Manually trigger the volunteer status update job
 * Useful for testing or manual execution
 */
export async function manuallyTriggerStatusUpdateJob(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('[Cron Jobs] Manual trigger of volunteer status update job');
    const result = await updateVolunteerStatuses();
    return {
      success: result.success,
      message: getStatusJobSummary(result)
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    console.error('[Cron Jobs] Manual trigger failed:', errorMsg);
    return {
      success: false,
      message: `Failed to execute job: ${errorMsg}`
    };
  }
}

/**
 * Reschedule the cron job with a new schedule
 * @param newSchedule - New cron expression
 */
export function rescheduleCronJob(newSchedule: string): void {
  if (!reminderCronJob) {
    console.log('[Cron Jobs] Scheduler not initialized, initializing now...');
    initializeCronJobs(newSchedule);
    return;
  }

  try {
    reminderCronJob.stop();
    reminderCronJob = cron.schedule(newSchedule, async () => {
      console.log('[Cron Jobs] Executing scheduled task reminder job...');
      try {
        const result = await processPendingTaskReminders();
        console.log('[Cron Jobs]', getJobSummary(result));
      } catch (error) {
        console.error('[Cron Jobs] Error executing scheduled job:', error);
      }
    });

    console.log(`[Cron Jobs] Cron job rescheduled to: ${newSchedule}`);
  } catch (error) {
    console.error('[Cron Jobs] Failed to reschedule cron job:', error);
  }
}
