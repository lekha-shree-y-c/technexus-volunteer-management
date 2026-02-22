/**
 * PUT /api/update-task
 *
 * Updates a task and sends email notifications to assigned volunteers
 * when important fields change (status, due_date, or assignees).
 *
 * Request body:
 * {
 *   "taskId": string,
 *   "title": string,
 *   "description": string | null,
 *   "due_date": string | null,
 *   "status": string,
 *   "volunteerIds": string[] (optional, to update assignees)
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "emailsSent": number,
 *   "emailsFailed": number,
 *   "changedFields": string[]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTaskReminderEmail } from '@/lib/brevo';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OldTaskData {
  title: string;
  status: string;
  due_date: string | null;
}

interface TaskUpdateRequest {
  taskId: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  volunteerIds?: string[];
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as TaskUpdateRequest;
    const { taskId, title, description, due_date, status, volunteerIds = [] } = body;

    // Validate required fields
    if (!taskId || !title?.trim()) {
      return NextResponse.json(
        { success: false, message: 'taskId and title are required' },
        { status: 400 }
      );
    }

    // Fetch old task data to detect changes
    const { data: oldTask, error: fetchError } = await supabaseServiceRole
      .from('tasks')
      .select('id, title, status, due_date')
      .eq('id', taskId)
      .single();

    if (fetchError || !oldTask) {
      console.error('[Task Update] Task not found:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    const oldTaskData = oldTask as OldTaskData;

    // Update task in database
    const { error: updateError } = await supabaseServiceRole
      .from('tasks')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        due_date: due_date || null,
        status
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('[Task Update] Update failed:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update task' },
        { status: 500 }
      );
    }

    // Detect which important fields changed
    const changedFields: string[] = [];
    if (oldTaskData.status !== status) changedFields.push('status');
    if (oldTaskData.due_date !== due_date) changedFields.push('due_date');

    // Check if assignees changed
    let assigneeChanged = false;
    if (volunteerIds && volunteerIds.length > 0) {
      const { data: currentAssignments, error: assignError } = await supabaseServiceRole
        .from('task_assignments')
        .select('volunteer_id')
        .eq('task_id', taskId);

      if (assignError) {
        console.error('[Task Update] Failed to fetch current assignments:', assignError);
      } else {
        const currentIds = (currentAssignments || []).map(a => a.volunteer_id);
        const newIds = volunteerIds.map(id => String(id));

        // Check if there's a difference
        if (currentIds.length !== newIds.length || 
            !currentIds.every(id => newIds.includes(String(id)))) {
          assigneeChanged = true;
          changedFields.push('assignees');

          // Update assignments
          const toAdd = newIds.filter(id => !currentIds.includes(id));
          const toRemove = currentIds.filter(id => !newIds.includes(id));

          if (toAdd.length > 0) {
            const assignments = toAdd.map(volunteerId => ({
              task_id: taskId,
              volunteer_id: volunteerId
            }));
            const { error: addError } = await supabaseServiceRole
              .from('task_assignments')
              .insert(assignments);
            if (addError) console.error('[Task Update] Failed to add assignments:', addError);
          }

          if (toRemove.length > 0) {
            const { error: removeError } = await supabaseServiceRole
              .from('task_assignments')
              .delete()
              .eq('task_id', taskId)
              .in('volunteer_id', toRemove);
            if (removeError) console.error('[Task Update] Failed to remove assignments:', removeError);
          }
        }
      }
    }

    // Only send emails if important fields changed
    let emailsSent = 0;
    let emailsFailed = 0;

    if (changedFields.length > 0) {
      // Fetch all assigned volunteers
      const { data: assignments, error: getAssignError } = await supabaseServiceRole
        .from('task_assignments')
        .select('volunteer_id')
        .eq('task_id', taskId);

      if (getAssignError) {
        console.error('[Task Update] Failed to fetch assignments for emails:', getAssignError);
      } else {
        const volunteerIds = assignments?.map(a => a.volunteer_id) || [];

        if (volunteerIds.length > 0) {
          // Fetch volunteer details
          const { data: volunteers, error: getVolError } = await supabaseServiceRole
            .from('volunteers')
            .select('id, full_name, email')
            .in('id', volunteerIds);

          if (getVolError) {
            console.error('[Task Update] Failed to fetch volunteer details:', getVolError);
          } else {
            // Send emails to each volunteer
            for (const volunteer of volunteers || []) {
              try {
                await sendTaskReminderEmail(
                  taskId,
                  volunteer.id,
                  volunteer.email,
                  volunteer.full_name,
                  title.trim(),
                  due_date || 'No due date',
                  1
                );
                emailsSent++;
                console.log(`[Task Update] Email sent to ${volunteer.full_name} (${volunteer.email})`);
              } catch (error) {
                emailsFailed++;
                const err = error instanceof Error ? error.message : String(error);
                console.error(
                  `[Task Update] Failed to send email to ${volunteer.full_name}: ${err}`
                );
              }
            }
          }
        }
      }
    }

    console.log(
      `[Task Update] Task ${taskId} updated successfully. Changed fields: ${changedFields.join(', ') || 'none'}. Emails sent: ${emailsSent}`
    );

    return NextResponse.json(
      {
        success: true,
        message: changedFields.length > 0
          ? `Task updated. Changes detected in: ${changedFields.join(', ')}. Emails sent: ${emailsSent}`
          : 'Task updated. No important fields changed.',
        emailsSent,
        emailsFailed,
        changedFields
      },
      { status: 200 }
    );
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error('[Task Update] Unexpected error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: err },
      { status: 500 }
    );
  }
}
