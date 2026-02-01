/**
 * Cron job scheduler for periodic task reminder emails
 * Runs once per day at a specified time
 */

import cron from 'node-cron';
import { processPendingTaskReminders, getJobSummary } from '@/lib/scheduled-tasks';

// Store the cron job instance for lifecycle management
let cronJob: cron.ScheduledTask | null = null;

/**
 * Initialize the cron job scheduler
 * Runs daily at 5:20 PM IST (11:50 AM UTC) by default
 * @param scheduleTime - Cron expression (default: "50 11 * * *" = 5:20 PM IST / 11:50 AM UTC)
 * @param runOnStartup - Whether to run the job immediately on initialization
 */
export function initializeCronJobs(
  scheduleTime: string = '50 11 * * *',
  runOnStartup: boolean = false
): void {
  // Don't initialize if already running
  if (cronJob) {
    console.log('[Cron Jobs] Scheduler already initialized');
    return;
  }

  try {
    console.log('[Cron Jobs] Initializing cron job scheduler...');

    // Create the cron job for task reminders
    cronJob = cron.schedule(scheduleTime, async () => {
      console.log('[Cron Jobs] Executing scheduled task reminder job...');
      try {
        const result = await processPendingTaskReminders();
        console.log('[Cron Jobs]', getJobSummary(result));
      } catch (error) {
        console.error('[Cron Jobs] Error executing scheduled job:', error);
      }
    });

    console.log(
      `[Cron Jobs] Task reminder job scheduled: ${scheduleTime} (5:20 PM IST / 11:50 AM UTC)`
    );

    // Run immediately on startup if requested
    if (runOnStartup) {
      console.log('[Cron Jobs] Running task reminder job on startup...');
      processPendingTaskReminders()
        .then((result) => {
          console.log('[Cron Jobs] Startup job completed');
          console.log('[Cron Jobs]', getJobSummary(result));
        })
        .catch((error) => {
          console.error('[Cron Jobs] Error running startup job:', error);
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
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[Cron Jobs] Scheduler stopped');
  }
}

/**
 * Check if cron jobs are running
 */
export function isCronJobsRunning(): boolean {
  return cronJob !== null;
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
      message: `Manual trigger failed: ${errorMsg}`
    };
  }
}

/**
 * Reschedule the cron job with a new schedule
 * @param newSchedule - New cron expression
 */
export function rescheduleCronJob(newSchedule: string): void {
  if (!cronJob) {
    console.log('[Cron Jobs] Scheduler not initialized, initializing now...');
    initializeCronJobs(newSchedule);
    return;
  }

  try {
    cronJob.stop();
    cronJob = cron.schedule(newSchedule, async () => {
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
