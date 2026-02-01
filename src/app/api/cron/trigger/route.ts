import { NextRequest, NextResponse } from 'next/server';
import {
  processPendingTaskReminders,
  getJobSummary,
  type ScheduledJobResult
} from '@/lib/scheduled-tasks';
import {
  isCronJobsRunning,
  manuallyTriggerTaskReminderJob,
  rescheduleCronJob
} from '@/lib/cron-jobs';

/**
 * POST /api/cron/trigger
 *
 * Manually trigger the scheduled task reminder job
 * Useful for testing or forcing an immediate execution
 *
 * Response:
 * {
 *   success: boolean,
 *   result: ScheduledJobResult
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'trigger';

    if (action === 'trigger') {
      // Manually trigger the task reminder job
      console.log('[API] Manually triggering task reminder job');
      const result = await processPendingTaskReminders();

      return NextResponse.json(
        {
          success: result.success,
          message: 'Job executed successfully',
          result
        },
        { status: 200 }
      );
    } else if (action === 'reschedule') {
      // Reschedule the cron job
      const { schedule } = body;

      if (!schedule) {
        return NextResponse.json(
          { success: false, message: 'Missing schedule parameter' },
          { status: 400 }
        );
      }

      try {
        rescheduleCronJob(schedule);
        return NextResponse.json(
          {
            success: true,
            message: `Cron job rescheduled to: ${schedule}`
          },
          { status: 200 }
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        return NextResponse.json(
          { success: false, message: `Failed to reschedule: ${errorMsg}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unknown action' },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Error triggering job:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to execute job',
        error: errorMsg
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/status
 *
 * Get the status of the cron job scheduler
 *
 * Response:
 * {
 *   running: boolean,
 *   message: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const isRunning = isCronJobsRunning();

    return NextResponse.json(
      {
        success: true,
        running: isRunning,
        message: isRunning
          ? 'Cron job scheduler is running'
          : 'Cron job scheduler is not running'
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Error checking cron status:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check cron status',
        error: errorMsg
      },
      { status: 500 }
    );
  }
}
