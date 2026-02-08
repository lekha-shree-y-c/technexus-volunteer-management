/**
 * Cron Endpoint Client Utility
 * 
 * Helper functions for triggering the reminder cron endpoint
 * Can be used from other services, scheduled jobs, or manual testing
 */

/**
 * Options for the cron endpoint request
 */
export interface CronEndpointOptions {
  url: string;                 // Full URL to the endpoint
  secret: string;              // Secret key for authentication
  timeout?: number;            // Request timeout in milliseconds (default: 30000)
  retries?: number;            // Number of retries on failure (default: 3)
  retryDelay?: number;         // Delay between retries in milliseconds (default: 5000)
}

/**
 * Response from the cron endpoint
 */
export interface CronEndpointResponse {
  success: boolean;
  message: string;
  data?: {
    timestamp: string;
    totalTasksProcessed: number;
    totalEmailsSent: number;
    totalEmailsFailed: number;
    durationMs: number;
  };
  error?: string;
}

/**
 * Result wrapper with execution details
 */
export interface CronExecutionResult {
  success: boolean;
  response: CronEndpointResponse;
  statusCode: number;
  executionTimeMs: number;
  retriesAttempted: number;
}

/**
 * Trigger the remote cron endpoint with automatic retries
 * 
 * @example
 * const result = await triggerReminders({
 *   url: 'https://your-app.onrender.com/api/cron/run-reminders',
 *   secret: process.env.CRON_SECRET_KEY!,
 *   timeout: 60000,  // 60 second timeout (accounts for Render wake-up)
 *   retries: 3
 * });
 * 
 * if (result.success) {
 *   console.log(`Sent ${result.response.data?.totalEmailsSent} emails`);
 * } else {
 *   console.error('Failed:', result.response.message);
 * }
 */
export async function triggerReminders(
  options: CronEndpointOptions
): Promise<CronExecutionResult> {
  const {
    url,
    secret,
    timeout = 30000,
    retries = 3,
    retryDelay = 5000
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;
  let lastStatusCode = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[Cron Client] Attempt ${attempt + 1}/${retries + 1}: Triggering reminders...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${url}?secret=${encodeURIComponent(secret)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CronClient/1.0'
          },
          signal: controller.signal,
          timeout
        });

        clearTimeout(timeoutId);
        lastStatusCode = response.status;

        // Parse response
        let data: CronEndpointResponse;
        try {
          data = await response.json();
        } catch {
          data = {
            success: false,
            message: `Invalid JSON response: ${response.statusText}`,
            error: `HTTP ${response.status}`
          };
        }

        // Return result even if success is false (error responses are valid)
        if (response.ok || response.status === 401 || response.status === 500) {
          const executionTimeMs = Date.now() - startTime;
          
          console.log(
            `[Cron Client] Request completed with status ${response.status} in ${executionTimeMs}ms`
          );

          return {
            success: response.ok,
            response: data,
            statusCode: response.status,
            executionTimeMs,
            retriesAttempted: attempt
          };
        }

        // Retry on network errors
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = retryDelay * Math.pow(1.5, attempt); // Exponential backoff
        console.warn(
          `[Cron Client] Attempt ${attempt + 1} failed: ${lastError.message}. ` +
          `Retrying in ${Math.round(delay)}ms...`
        );
        await sleep(delay);
      } else {
        console.error(
          `[Cron Client] All ${retries + 1} attempts failed. Last error: ${lastError.message}`
        );
      }
    }
  }

  // All retries exhausted
  const executionTimeMs = Date.now() - startTime;
  
  return {
    success: false,
    response: {
      success: false,
      message: `Failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      error: lastError?.message
    },
    statusCode: lastStatusCode,
    executionTimeMs,
    retriesAttempted: retries + 1
  };
}

/**
 * Simple synchronous trigger (no retries)
 * Most useful for simple requests without retry logic
 */
export async function triggerRemindersSimple(
  url: string,
  secret: string
): Promise<CronEndpointResponse> {
  const response = await fetch(`${url}?secret=${encodeURIComponent(secret)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Trigger with logging and error handling
 * Good for scheduled jobs and background tasks
 */
export async function triggerRemindersWithLogging(
  url: string,
  secret: string,
  onSuccess?: (result: CronEndpointResponse) => void,
  onError?: (error: Error | CronEndpointResponse) => void
): Promise<void> {
  try {
    console.log(`[Reminders] Triggering cron job at ${new Date().toISOString()}`);

    const result = await triggerReminders({
      url,
      secret,
      timeout: 60000,
      retries: 3,
      retryDelay: 5000
    });

    if (result.success) {
      console.log(
        `[Reminders] ✅ Job completed successfully (${result.executionTimeMs}ms). ` +
        `Processed ${result.response.data?.totalTasksProcessed} tasks, ` +
        `sent ${result.response.data?.totalEmailsSent} emails`
      );

      onSuccess?.(result.response);
    } else {
      const errorMsg = result.response.error || result.response.message;
      console.error(`[Reminders] ❌ Job failed: ${errorMsg}`);

      onError?.(result.response);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Reminders] ❌ Unexpected error: ${errorMsg}`);

    onError?.(error instanceof Error ? error : new Error(errorMsg));
  }
}

/**
 * Helper to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format execution result for logging/display
 */
export function formatResult(result: CronExecutionResult): string {
  const { success, response, statusCode, executionTimeMs, retriesAttempted } = result;

  const statusEmoji = success ? '✅' : '❌';
  const statusText = success ? 'SUCCESS' : 'FAILED';

  let output = `${statusEmoji} ${statusText} (HTTP ${statusCode}, ${executionTimeMs}ms)`;

  if (response.data) {
    output += `\n  Tasks: ${response.data.totalTasksProcessed}, `;
    output += `Sent: ${response.data.totalEmailsSent}, `;
    output += `Failed: ${response.data.totalEmailsFailed}`;
  }

  if (retriesAttempted > 0) {
    output += `\n  Retries: ${retriesAttempted}`;
  }

  return output;
}
