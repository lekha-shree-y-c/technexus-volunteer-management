'use server';

import { initializeBackgroundJobs } from '@/lib/init-background-jobs';

// Initialize background jobs on server startup
// This runs once when the Next.js app starts
initializeBackgroundJobs();

/**
 * Server-side initialization component
 * This is a no-op component used to trigger server initialization
 */
export async function BackgroundJobsInitializer() {
  return null;
}
