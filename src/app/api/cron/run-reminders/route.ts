/**
 * Secure Cron Endpoint for Scheduled Task Reminders
 * 
 * POST /api/cron/run-reminders
 * 
 * Triggers the scheduled task reminder job with secret key authentication.
 * This endpoint is designed to be called by external cron services (Render, Easycron, etc.)
 * 
 * Query Parameters:
 *   secret: The cron secret key (must match CRON_SECRET_KEY env variable)
 * 
 * Example calls:
 *   GET: /api/cron/run-reminders?secret=your_secret_key
 *   POST: /api/cron/run-reminders (with secret in query or body)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPendingTaskReminders } from '@/lib/scheduled-tasks';

// Validate that the secret key is configured
const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;

if (!CRON_SECRET_KEY) {
  console.warn(
    '[Cron Endpoint] WARNING: CRON_SECRET_KEY environment variable is not set. ' +
    'This endpoint will reject all requests. Set it in your .env.local file.'
  );
}

/**
 * GET handler - allows simple HTTP GET requests from external cron services
 */
export async function GET(request: NextRequest) {
  try {
    // Extract secret from query parameters
    const { searchParams } = new URL(request.url);
    const providedSecret = searchParams.get('secret');

    return handleCronRequest(providedSecret);
  } catch (error) {
    console.error('[Cron Endpoint] Unexpected error in GET handler:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - for applications sending POST requests with secret in body or query
 */
export async function POST(request: NextRequest) {
  try {
    // Try to get secret from query parameters first
    const { searchParams } = new URL(request.url);
    let providedSecret = searchParams.get('secret');

    // If not in query, try to parse from request body
    if (!providedSecret) {
      try {
        const body = await request.json();
        providedSecret = body.secret;
      } catch {
        // Body is not JSON or doesn't contain secret
      }
    }

    return handleCronRequest(providedSecret);
  } catch (error) {
    console.error('[Cron Endpoint] Unexpected error in POST handler:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * Core handler for cron requests with validation and execution
 */
async function handleCronRequest(providedSecret: string | null) {
  // Validate secret key
  if (!CRON_SECRET_KEY) {
    console.error('[Cron Endpoint] CRON_SECRET_KEY is not configured');
    return NextResponse.json(
      {
        success: false,
        message: 'Cron service not configured'
      },
      { status: 500 }
    );
  }

  if (!providedSecret) {
    console.warn('[Cron Endpoint] Request rejected: No secret provided');
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication failed: secret key is required'
      },
      { status: 401 }
    );
  }

  // Use constant-time comparison to prevent timing attacks
  if (!constantTimeEquals(providedSecret, CRON_SECRET_KEY)) {
    console.warn('[Cron Endpoint] Request rejected: Invalid secret key');
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication failed: invalid secret key'
      },
      { status: 401 }
    );
  }

  // Execute the reminder job
  console.log('[Cron Endpoint] Authenticated request received. Starting reminder job...');
  
  try {
    const startTime = Date.now();
    const result = await processPendingTaskReminders();
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(
        `[Cron Endpoint] Job completed successfully in ${duration}ms. ` +
        `Tasks: ${result.totalTasksProcessed}, Emails sent: ${result.totalEmailsSent}`
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Reminders sent successfully',
          data: {
            timestamp: result.timestamp,
            totalTasksProcessed: result.totalTasksProcessed,
            totalEmailsSent: result.totalEmailsSent,
            totalEmailsFailed: result.totalEmailsFailed,
            durationMs: duration
          }
        },
        { status: 200 }
      );
    } else {
      console.error('[Cron Endpoint] Job completed with errors:', result.errors);

      return NextResponse.json(
        {
          success: false,
          message: 'Job completed with errors',
          data: {
            timestamp: result.timestamp,
            totalTasksProcessed: result.totalTasksProcessed,
            totalEmailsSent: result.totalEmailsSent,
            totalEmailsFailed: result.totalEmailsFailed,
            errors: result.errors,
            durationMs: duration
          }
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Cron Endpoint] Job execution failed:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: 'Job execution failed',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Ensures that secret key validation takes the same time regardless of where the comparison fails
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare to avoid leaking length information
    return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
  }
  return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
}
