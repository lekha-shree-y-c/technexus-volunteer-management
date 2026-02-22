// Examples: Using the Cron Endpoint Client

// ============================================================================
// Example 1: Simple One-Off Trigger (Most Common)
// ============================================================================

import { triggerReminders, triggerRemindersWithLogging } from '@/lib/cron-client';

// Basic usage
async function example1_SimpleCall() {
  const result = await triggerReminders({
    url: 'https://your-app.onrender.com/api/cron/run-reminders',
    secret: process.env.CRON_SECRET_KEY!,
    timeout: 60000  // 60 second timeout to account for Render wake-up time
  });

  console.log(`Job succeeded: ${result.success}`);
  console.log(`Emails sent: ${result.response.data?.totalEmailsSent}`);
  console.log(`Execution time: ${result.executionTimeMs}ms`);
}

// ============================================================================
// Example 2: With Logging and Error Handling (Recommended)
// ============================================================================

async function example2_WithLogging() {
  await triggerRemindersWithLogging(
    'https://your-app.onrender.com/api/cron/run-reminders',
    process.env.CRON_SECRET_KEY!,
    // Success callback
    (result) => {
      console.log(`Reminder job completed. Sent: ${result.data?.totalEmailsSent}`);
      // Could send notification, update database, etc.
    },
    // Error callback
    (error) => {
      console.error('Reminder job failed');
      // Could send alert, retry, etc.
    }
  );
}

// ============================================================================
// Example 3: Manual CLI Script for Testing
// ============================================================================

// Create a file: scripts/trigger-reminders.js
// Run with: node scripts/trigger-reminders.js

async function cliScript() {
  const { triggerReminders, formatResult } = require('@/lib/cron-client');

  const url = process.env.CRON_URL || 'http://localhost:3000/api/cron/run-reminders';
  const secret = process.env.CRON_SECRET_KEY;

  if (!secret) {
    console.error('❌ CRON_SECRET_KEY environment variable not set');
    process.exit(1);
  }

  console.log(`🚀 Triggering reminders at ${url}`);
  console.log('Waiting for response...\n');

  const result = await triggerReminders({
    url,
    secret,
    timeout: 120000,  // 2 minute timeout for CLI
    retries: 5
  });

  console.log(formatResult(result));

  if (!result.success) {
    process.exit(1);
  }
}

// ============================================================================
// Example 4: Integration with External Scheduler (e.g., Bull/Redis)
// ============================================================================

import { Queue } from 'bull';
import { triggerRemindersWithLogging } from '@/lib/cron-client';

// Set up Bull queue (Redis-based job scheduling)
const reminderQueue = new Queue('reminders', {
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// Define job processor
reminderQueue.process(async (job) => {
  console.log(`Processing reminder job: ${job.id}`);

  await triggerRemindersWithLogging(
    'https://your-app.onrender.com/api/cron/run-reminders',
    process.env.CRON_SECRET_KEY!,
    (result) => {
      job.progress(100);  // Mark as complete
      console.log(`Job ${job.id} completed`);
    },
    (error) => {
      throw new Error(`Reminder job failed: ${error}`);
    }
  );
});

// Schedule daily at 5 AM
reminderQueue.add({}, {
  repeat: {
    cron: '0 5 * * *'  // 5 AM UTC
  }
});

// ============================================================================
// Example 5: Express.js Route Handler
// ============================================================================

import express from 'express';
import { triggerReminders, formatResult } from '@/lib/cron-client';

const app = express();

// Manual trigger route (accessible from admin panel)
app.post('/admin/manual-trigger', async (req, res) => {
  // Add your own authentication here
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await triggerReminders({
      url: process.env.CRON_ENDPOINT || 'http://localhost:3000/api/cron/run-reminders',
      secret: process.env.CRON_SECRET_KEY!,
      timeout: 120000
    });

    res.json({
      success: result.success,
      message: formatResult(result),
      details: result.response.data
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================================================
// Example 6: Cron Job with Health Checks
// ============================================================================

import * as cron from 'node-cron';
import { triggerReminders } from '@/lib/cron-client';

let lastJobStatus = {
  success: false,
  timestamp: null as Date | null,
  error: null as string | null
};

// Run daily at 5 AM UTC
cron.schedule('0 5 * * *', async () => {
  console.log('[Cron] Running scheduled reminders...');

  try {
    const result = await triggerReminders({
      url: process.env.CRON_ENDPOINT!,
      secret: process.env.CRON_SECRET_KEY!,
      timeout: 120000,
      retries: 3
    });

    lastJobStatus = {
      success: result.success,
      timestamp: new Date(),
      error: result.success ? null : result.response.message
    };

    if (result.success) {
      console.log('[Cron] ✅ Job completed successfully');
    } else {
      console.error('[Cron] ❌ Job failed:', result.response.message);
      // Optionally send alert email or notification
    }
  } catch (error) {
    lastJobStatus = {
      success: false,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : String(error)
    };

    console.error('[Cron] ❌ Unexpected error:', error);
  }
});

// Health check endpoint
app.get('/health/cron', (req, res) => {
  const hoursSinceLastRun = lastJobStatus.timestamp
    ? (Date.now() - lastJobStatus.timestamp.getTime()) / (1000 * 60 * 60)
    : null;

  const isHealthy = lastJobStatus.success && hoursSinceLastRun! < 25;

  res.status(isHealthy ? 200 : 503).json({
    healthy: isHealthy,
    lastRun: lastJobStatus.timestamp,
    status: lastJobStatus.success ? 'success' : 'failed',
    error: lastJobStatus.error,
    hoursSinceLastRun
  });
});

// ============================================================================
// Example 7: GitHub Actions Workflow
// ============================================================================

/*
Create file: .github/workflows/daily-reminders.yml

name: Daily Task Reminders

on:
  workflow_dispatch:  # Manual trigger from Actions tab
  schedule:
    - cron: '0 5 * * *'  # 5 AM UTC daily

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger reminder job
        run: |
          response=$(curl -s -X POST \
            "https://your-app.onrender.com/api/cron/run-reminders?secret=${{ secrets.CRON_SECRET_KEY }}" \
            -H "Content-Type: application/json")
          
          echo "Response: $response"
          
          # Check if successful
          if echo "$response" | grep -q '"success":true'; then
            echo "✅ Reminders sent successfully"
            exit 0
          else
            echo "❌ Failed to send reminders"
            exit 1
          fi

      - name: Send notification on failure
        if: failure()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: ${{ secrets.EMAIL_SERVER }}
          server_port: ${{ secrets.EMAIL_PORT }}
          username: ${{ secrets.EMAIL_USERNAME }}
          password: ${{ secrets.EMAIL_PASSWORD }}
          subject: ❌ Failed to send task reminders
          to: admin@example.com
          from: notifications@example.com
          body: The scheduled task reminder job failed. Check logs.
*/

// ============================================================================
// Example 8: Monitoring Dashboard Endpoint
// ============================================================================

interface ReminderMetrics {
  lastRun: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
}

const metrics: ReminderMetrics = {
  lastRun: null,
  lastSuccess: null,
  lastFailure: null,
  totalRuns: 0,
  successCount: 0,
  failureCount: 0,
  averageExecutionTime: 0
};

async function recordReminderExecution(success: boolean, duration: number) {
  metrics.totalRuns++;
  metrics.lastRun = new Date();

  if (success) {
    metrics.lastSuccess = new Date();
    metrics.successCount++;
  } else {
    metrics.lastFailure = new Date();
    metrics.failureCount++;
  }

  // Calculate running average
  metrics.averageExecutionTime =
    (metrics.averageExecutionTime * (metrics.totalRuns - 1) + duration) /
    metrics.totalRuns;
}

app.get('/admin/metrics/reminders', (req, res) => {
  res.json({
    ...metrics,
    successRate: `${((metrics.successCount / metrics.totalRuns) * 100).toFixed(2)}%`,
    uptime: metrics.lastFailure
      ? `${Math.floor((Date.now() - metrics.lastFailure.getTime()) / (1000 * 60 * 60))} hours`
      : 'All runs successful'
  });
});

// ============================================================================
// Example 9: Retry Strategy with Exponential Backoff
// ============================================================================

async function triggerWithAdvancedRetry(
  url: string,
  secret: string,
  maxAttempts: number = 5,
  initialDelay: number = 1000  // 1 second
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await triggerReminders({
        url,
        secret,
        timeout: 60000
      });

      if (result.success) {
        console.log(`✅ Success on attempt ${attempt}`);
        return true;
      }

      // Authentication errors shouldn't be retried
      if (result.statusCode === 401) {
        console.error('❌ Authentication failed. Check secret key.');
        return false;
      }

      // Other errors are retryable
      throw new Error(`HTTP ${result.statusCode}: ${result.response.message}`);
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      const delay = initialDelay * Math.pow(2, attempt - 1);  // Exponential backoff

      if (isLastAttempt) {
        console.error(`❌ Failed after ${maxAttempts} attempts`);
        return false;
      }

      console.warn(
        `⚠️ Attempt ${attempt} failed: ${error}. ` +
        `Retrying in ${Math.round(delay / 1000)}s...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

// ============================================================================
// Example 10: Testing the Endpoint
// ============================================================================

import { describe, it, expect } from 'vitest';

describe('Cron Endpoint', () => {
  it('should trigger reminders with valid secret', async () => {
    const result = await triggerReminders({
      url: process.env.TEST_CRON_URL!,
      secret: process.env.TEST_CRON_SECRET!,
      timeout: 60000
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid secret', async () => {
    const result = await triggerReminders({
      url: process.env.TEST_CRON_URL!,
      secret: 'wrong-secret',
      timeout: 60000
    });

    expect(result.success).toBe(false);
    expect(result.response.message).toContain('Authentication failed');
  });

  it('should handle network timeout', async () => {
    const result = await triggerReminders({
      url: 'https://unreachable-domain-12345.example.com/api/cron/run-reminders',
      secret: process.env.TEST_CRON_SECRET!,
      timeout: 1000,
      retries: 1
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Summary of Examples
// ============================================================================

/*
Choose based on your use case:

1. Simple Call - For quick one-off tests
2. With Logging - For production use with monitoring
3. CLI Script - For manual testing from terminal
4. Bull/Redis - For job queue with persistence
5. Express Route - For admin-triggered reminders
6. Node-Cron - For local scheduling
7. GitHub Actions - For cloud-native scheduling
8. Dashboard - For monitoring and health checks
9. Advanced Retry - For maximum reliability
10. Tests - For automated testing

Most common setup: GitHub Actions (free, reliable) + Example 2 (logging)
*/
