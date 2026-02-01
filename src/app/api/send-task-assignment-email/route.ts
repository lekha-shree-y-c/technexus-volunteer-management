import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail } from '@/lib/brevo';

/**
 * POST /api/send-task-assignment-email
 * 
 * Sends an immediate email when a task is assigned to a volunteer.
 * Used when a task assignment is created.
 * 
 * Expects JSON body:
 * {
 *   "task_id": number,
 *   "volunteer_id": number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json(
        { error: 'BREVO_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { task_id, volunteer_id } = body;

    if (!task_id || !volunteer_id) {
      return NextResponse.json(
        { error: 'task_id and volunteer_id are required' },
        { status: 400 }
      );
    }

    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch task and volunteer details
    const { data: taskData, error: taskError } = await supabaseServiceRole
      .from('tasks')
      .select('id, title, due_date, status')
      .eq('id', task_id)
      .single();

    if (taskError || !taskData) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Don't send if task is already completed
    if (taskData.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot send email for completed task' },
        { status: 400 }
      );
    }

    const { data: volunteerData, error: volunteerError } = await supabaseServiceRole
      .from('volunteers')
      .select('id, full_name, email')
      .eq('id', volunteer_id)
      .single();

    if (volunteerError || !volunteerData) {
      return NextResponse.json(
        { error: 'Volunteer not found' },
        { status: 404 }
      );
    }

    if (!volunteerData.email) {
      return NextResponse.json(
        { error: 'Volunteer has no email address' },
        { status: 400 }
      );
    }

    // Send immediate email
    const messageId = await sendTaskReminderEmail(
      taskData.id,
      volunteerData.id,
      volunteerData.email,
      volunteerData.full_name,
      taskData.title,
      taskData.due_date || 'No due date'
    );

    // Track the email sent
    const { error: trackingError } = await supabaseServiceRole
      .from('email_tracking')
      .insert({
        task_id: taskData.id,
        volunteer_id: volunteerData.id,
        email_sent_date: new Date().toISOString(),
        brevo_message_id: messageId
      });

    if (trackingError) {
      console.error('Error tracking email:', trackingError);
      // Still return success as email was sent
    }

    return NextResponse.json({
      success: true,
      message: 'Task assignment email sent successfully',
      messageId
    });
  } catch (error) {
    const err = error as Error;
    console.error('Task assignment email error:', err.message);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
