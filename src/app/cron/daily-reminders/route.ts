/**
 * GET /cron/daily-reminders
 *
 * Secure endpoint to send daily task reminder emails.
 * Protected with ?key=CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail } from '@/lib/brevo';

function validateEnvironmentVariables(): void {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVars.join(', ')}`
    );
  }
}

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendDailyReminders() {
  validateEnvironmentVariables();

  const today = new Date().toISOString().split('T')[0];

  const { data: taskAssignments, error: queryError } = await supabaseServiceRole
    .from('task_assignments')
    .select(
      `
      task_id,
      volunteer_id,
      tasks!inner(id, title, status, due_date),
      volunteers!inner(id, full_name, email)
      `
    )
    .not('tasks.status', 'ilike', 'completed');

  if (queryError) {
    console.error('[Daily Reminders] Error fetching task assignments:', queryError);
    throw new Error('Failed to fetch task assignments');
  }

  if (!taskAssignments || taskAssignments.length === 0) {
    return {
      success: true,
      message: 'No incomplete task assignments found',
      emailsSent: 0
    };
  }

  const taskVolunteerPairs = taskAssignments.map((assignment) => ({
    task_id: (assignment.tasks as any).id,
    volunteer_id: (assignment.volunteers as any).id
  }));

  const { data: sentEmails } = await supabaseServiceRole
    .from('email_tracking')
    .select('task_id, volunteer_id, email_sent_date')
    .in(
      'task_id',
      taskVolunteerPairs.map((p) => p.task_id)
    );

  const sentTodaySet = new Set<string>();
  if (sentEmails) {
    sentEmails.forEach((record) => {
      const recordDate = new Date(record.email_sent_date)
        .toISOString()
        .split('T')[0];
      if (recordDate === today) {
        sentTodaySet.add(`${record.task_id}-${record.volunteer_id}`);
      }
    });
  }

  const assignmentsToEmail = taskAssignments.filter((assignment) => {
    const taskId = (assignment.tasks as any).id;
    const volunteerId = (assignment.volunteers as any).id;
    return !sentTodaySet.has(`${taskId}-${volunteerId}`);
  });

  if (assignmentsToEmail.length === 0) {
    return {
      success: true,
      message: 'All task assignments have already received emails today',
      emailsSent: 0
    };
  }

  let successCount = 0;

  for (const assignment of assignmentsToEmail) {
    try {
      const task = assignment.tasks as any;
      const volunteer = assignment.volunteers as any;

      const messageId = await sendTaskReminderEmail(
        task.id,
        volunteer.id,
        volunteer.email,
        volunteer.full_name,
        task.title,
        task.due_date || 'No due date'
      );

      const { error: insertError } = await supabaseServiceRole
        .from('email_tracking')
        .insert({
          task_id: task.id,
          volunteer_id: volunteer.id,
          email_sent_date: new Date().toISOString(),
          brevo_message_id: messageId
        });

      if (insertError) {
        console.error('[Daily Reminders] Tracking insert failed:', insertError);
      } else {
        successCount++;
      }
    } catch (emailError) {
      const err = emailError as Error;
      console.error('[Daily Reminders] Error sending email:', err.message);
    }
  }

  console.log(`[Daily Reminders] Sent ${successCount} emails`);

  return {
    success: true,
    message: `Sent ${successCount} reminder emails`,
    emailsSent: successCount
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
  }
  return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providedKey = searchParams.get('key');
    const expectedKey = process.env.CRON_SECRET || '';

    if (!providedKey) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed: key is required' },
        { status: 401 }
      );
    }

    if (!expectedKey || !constantTimeEquals(providedKey, expectedKey)) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed: invalid key' },
        { status: 401 }
      );
    }

    const result = await sendDailyReminders();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const err = error as Error;
    console.error('[Daily Reminders] API error:', err.message);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: err.message },
      { status: 500 }
    );
  }
}
