import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail } from '@/lib/brevo';

function validateEnvironmentVariables(): void {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY
  };

  const missingVars: string[] = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVars.join(', ')}. Please ensure these are configured in your .env.local file.`
    );
  }
}


/**
 * POST /api/assign-task
 *
 * Creates a task, assigns it to volunteers, and sends immediate emails.
 * Body:
 * {
 *   "title": string,
 *   "description": string,
 *   "due_date": string | null,
 *   "volunteer_ids": string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    validateEnvironmentVariables();

    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { title, description, due_date, volunteer_ids } = body ?? {};

    if (!title || !Array.isArray(volunteer_ids) || volunteer_ids.length === 0) {
      return NextResponse.json(
        { error: 'title and volunteer_ids are required' },
        { status: 400 }
      );
    }

    const volunteerIds = [...new Set(volunteer_ids.map((id: string) => String(id).trim()))]
      .filter((id) => id.length > 0);
    if (volunteerIds.length === 0) {
      return NextResponse.json(
        { error: 'volunteer_ids must be non-empty strings' },
        { status: 400 }
      );
    }

    const { data: task, error: taskError } = await supabaseServiceRole
      .from('tasks')
      .insert([{ title, description: description || null, due_date: due_date || null }])
      .select('id, title, due_date, status')
      .single();

    if (taskError || !task) {
      console.error('Error creating task:', taskError);
      return NextResponse.json(
        { error: 'Failed to create task', details: taskError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const assignments = volunteerIds.map((volunteerId) => ({
      task_id: task.id,
      volunteer_id: volunteerId
    }));

    const { error: assignError } = await supabaseServiceRole
      .from('task_assignments')
      .insert(assignments);

    if (assignError) {
      console.error('Error creating task assignments:', assignError);
      return NextResponse.json(
        { error: 'Failed to assign task', details: assignError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const { data: volunteers, error: volunteerError } = await supabaseServiceRole
      .from('volunteers')
      .select('id, full_name, email')
      .in('id', volunteerIds);

    if (volunteerError || !volunteers) {
      console.error('Error fetching volunteers:', volunteerError);
      return NextResponse.json(
        { error: 'Failed to fetch volunteers', details: volunteerError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    const volunteerMap = new Map(
      volunteers.map((v) => [v.id, { name: v.full_name, email: v.email }])
    );

    const emailResults: Array<{
      volunteer_id: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const volunteerId of volunteerIds) {
      const volunteer = volunteerMap.get(volunteerId);

      if (!volunteer?.email) {
        emailResults.push({
          volunteer_id: volunteerId,
          success: false,
          error: 'Volunteer has no email address'
        });
        continue;
      }

      try {
        const messageId = await sendTaskReminderEmail(
          task.id,
          volunteerId,
          volunteer.email,
          volunteer.name,
          task.title,
          task.due_date || 'No due date'
        );

        const { error: trackingError } = await supabaseServiceRole
          .from('email_tracking')
          .insert({
            task_id: task.id,
            volunteer_id: volunteerId,
            email_sent_date: new Date().toISOString(),
            brevo_message_id: messageId
          });

        if (trackingError) {
          console.error('Error tracking email:', trackingError);
        }

        emailResults.push({ volunteer_id: volunteerId, success: true });
      } catch (error) {
        const err = error as Error;
        console.error('Error sending email:', err.message);
        emailResults.push({
          volunteer_id: volunteerId,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      task,
      assignmentsCreated: assignments.length,
      emailResults
    });
  } catch (error) {
    const err = error as Error;
    console.error('Assign task API error:', err.message);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
