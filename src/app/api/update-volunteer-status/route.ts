import { NextRequest, NextResponse } from 'next/server';
import { manuallyTriggerStatusUpdateJob } from '@/lib/cron-jobs';

/**
 * POST /api/update-volunteer-status
 * 
 * Manually trigger the volunteer status update job.
 * Updates volunteer status based on task assignments and activity.
 * 
 * Rules:
 * - Inactive if no assignments for 7+ days and no incomplete tasks
 * - Active if has incomplete tasks OR recent assignment (<7 days)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Manual trigger of volunteer status update job');
    const result = await manuallyTriggerStatusUpdateJob();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      triggered_at: new Date().toISOString(),
      note: 'Volunteer status update job executed manually'
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API] Volunteer status update API error:', err.message);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/update-volunteer-status
 * 
 * Testing endpoint for manual trigger of volunteer status updates.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Manual trigger of volunteer status update job (GET)');
    const result = await manuallyTriggerStatusUpdateJob();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      triggered_at: new Date().toISOString(),
      note: 'Volunteer status update job executed manually'
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API] Volunteer status update API error:', err.message);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
