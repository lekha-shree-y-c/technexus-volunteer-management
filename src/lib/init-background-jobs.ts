/**
 * Server-side initialization for scheduled tasks
 * This runs once when the Next.js server starts
 */

import { initializeCronJobs } from '@/lib/cron-jobs';

/**
 * Initialize all scheduled background jobs
 * This should be called early in the application startup
 */
export function initializeBackgroundJobs(): void {
  // Initialize cron jobs
  // Schedule: Daily at 11:50 AM UTC (5:20 PM IST)
  // Set runOnStartup to false in production (avoid email floods on server restart)
  initializeCronJobs('50 11 * * *', false);
}
