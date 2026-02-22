import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendVolunteerReminderEmail } from '@/lib/brevo';

interface TaskSummary {
  id: number;
  title: string;
  status: string;
  due_date: string | null;
}

interface VolunteerSummary {
  id: number;
  full_name: string;
  email: string | null;
  last_reminder_sent: string | null;
}

interface TaskAssignmentRow {
  task_id: number;
  volunteer_id: number;
  tasks: TaskSummary[];
  volunteers: VolunteerSummary[];
}

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function validateEnvironmentVariables(): void {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY
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

function getCutoffDate(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const concurrency = Math.max(1, Math.floor(limit));
  let index = 0;

  const runners = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });

  await Promise.all(runners);
}

export async function GET() {
  try {
    validateEnvironmentVariables();

    const { data: assignments, error: assignmentError } = await supabaseServiceRole
      .from('task_assignments')
      .select(
        `
        task_id,
        volunteer_id,
        tasks!inner(id, title, status, due_date),
        volunteers!inner(id, full_name, email, last_reminder_sent)
        `
      )
      .neq('tasks.status', 'Completed');

    if (assignmentError) {
      console.error('[Send Reminders] Error fetching assignments:', assignmentError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No incomplete task assignments found',
          processed: 0,
          emailsSent: 0,
          skipped: 0
        },
        { status: 200 }
      );
    }

    const volunteersMap = new Map<number, {
      volunteer: VolunteerSummary;
      tasks: TaskSummary[];
    }>();

    for (const assignment of assignments as TaskAssignmentRow[]) {
      const volunteer = assignment.volunteers?.[0];
      const task = assignment.tasks?.[0];

      if (!volunteer || !task) {
        continue;
      }

      const status = String(task.status || '').toLowerCase();
      if (status === 'completed') {
        continue;
      }

      const entry = volunteersMap.get(volunteer.id) || {
        volunteer,
        tasks: []
      };

      entry.tasks.push(task);
      volunteersMap.set(volunteer.id, entry);
    }

    const volunteerEntries = Array.from(volunteersMap.values());
    if (volunteerEntries.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No volunteers eligible for reminders',
          processed: 0,
          emailsSent: 0,
          skipped: 0
        },
        { status: 200 }
      );
    }

    const cutoff = getCutoffDate(24);
    const nowIso = new Date().toISOString();

    let processed = 0;
    let emailsSent = 0;
    let skipped = 0;

    const concurrency = Number(process.env.REMINDER_SEND_CONCURRENCY || 5);

    await mapWithConcurrency(volunteerEntries, concurrency, async (entry) => {
      processed += 1;

      const { volunteer, tasks } = entry;
      const lastReminderSent = volunteer.last_reminder_sent
        ? new Date(volunteer.last_reminder_sent)
        : null;

      if (!volunteer.email) {
        skipped += 1;
        console.log(`[Send Reminders] Skipped (no email): ${volunteer.id}`);
        return;
      }

      if (tasks.length === 0) {
        skipped += 1;
        console.log(`[Send Reminders] Skipped (no incomplete tasks): ${volunteer.email}`);
        return;
      }

      if (lastReminderSent && lastReminderSent > cutoff) {
        skipped += 1;
        console.log(`[Send Reminders] Skipped (recent reminder): ${volunteer.email}`);
        return;
      }

      try {
        await sendVolunteerReminderEmail(
          volunteer.email,
          volunteer.full_name,
          tasks
        );

        const { error: updateError } = await supabaseServiceRole
          .from('volunteers')
          .update({ last_reminder_sent: nowIso })
          .eq('id', volunteer.id);

        if (updateError) {
          console.error(
            `[Send Reminders] Failed to update last_reminder_sent for ${volunteer.email}:`,
            updateError
          );
        }

        emailsSent += 1;
        console.log(`[Send Reminders] Email sent: ${volunteer.email}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Send Reminders] Email failed for ${volunteer.email}: ${message}`);
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${processed} volunteers`,
        processed,
        emailsSent,
        skipped
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Send Reminders] API error:', message);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: message },
      { status: 500 }
    );
  }
}
