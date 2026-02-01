import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendTaskReminderEmail } from '@/lib/brevo';
import {
  hasEmailBeenSentToday,
  recordEmailSent,
  cleanupOldRecords
} from '@/lib/email-tracking';

/**
 * POST /api/send-task-reminder
 *
 * Send a task reminder email to a volunteer using Brevo transactional email API
 *
 * Request body:
 * {
 *   taskId: number,
 *   volunteerId: number,
 *   volunteerEmail: string,
 *   volunteerName: string,
 *   taskTitle: string,
 *   dueDate: string (ISO date format or any date format),
 *   templateId?: number (Brevo template ID, defaults to 1)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   messageId?: string,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      taskId,
      volunteerId,
      volunteerEmail,
      volunteerName,
      taskTitle,
      dueDate,
      templateId = 1
    } = body;

    // Validate required fields
    if (
      !taskId ||
      !volunteerId ||
      !volunteerEmail ||
      !volunteerName ||
      !taskTitle ||
      !dueDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: taskId, volunteerId, volunteerEmail, volunteerName, taskTitle, dueDate'
        },
        { status: 400 }
      );
    }

    // Check if task exists and is not completed
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    // Don't send emails for completed tasks
    if (task.status === 'Completed') {
      return NextResponse.json(
        {
          success: false,
          message: 'Email not sent: Task is already completed'
        },
        { status: 200 }
      );
    }

    // Check if email has already been sent today for this task
    if (hasEmailBeenSentToday(taskId, volunteerId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email already sent today for this task'
        },
        { status: 200 }
      );
    }

    // Check if volunteer exists
    const { data: volunteer, error: volunteerError } = await supabase
      .from('volunteers')
      .select('id, full_name')
      .eq('id', volunteerId)
      .single();

    if (volunteerError || !volunteer) {
      return NextResponse.json(
        { success: false, message: 'Volunteer not found' },
        { status: 404 }
      );
    }

    // Send the email using Brevo
    const messageId = await sendTaskReminderEmail(
      taskId,
      volunteerId,
      volunteerEmail,
      volunteerName,
      taskTitle,
      dueDate,
      templateId
    );

    // Record that email was sent today
    recordEmailSent(taskId, volunteerId, messageId);

    // Optional: cleanup old tracking records
    cleanupOldRecords();

    return NextResponse.json(
      {
        success: true,
        messageId,
        message: `Email successfully sent to ${volunteerEmail}`
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error sending task reminder email:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send email',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/send-task-reminder?taskId=<id>&volunteerId=<id>
 *
 * Check if an email has been sent today for a specific task-volunteer pair
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = parseInt(searchParams.get('taskId') || '0');
    const volunteerId = parseInt(searchParams.get('volunteerId') || '0');

    if (!taskId || !volunteerId) {
      return NextResponse.json(
        { success: false, message: 'Missing taskId or volunteerId' },
        { status: 400 }
      );
    }

    const sent = hasEmailBeenSentToday(taskId, volunteerId);

    return NextResponse.json(
      { success: true, emailSentToday: sent },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking email status:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check email status',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
