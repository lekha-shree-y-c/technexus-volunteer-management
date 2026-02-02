/**
 * Volunteer status updater - Automatically updates volunteer status based on activity
 * 
 * Rules:
 * - Volunteer marked Inactive if no task assignments for 7+ days
 * - Volunteer remains Active if they have any ongoing (incomplete) tasks
 * - Status updates are based on task data, not manual flags
 */

import { createClient } from '@supabase/supabase-js';

// Use service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface VolunteerStatusResult {
  volunteerId: number;
  volunteerName: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

export interface StatusUpdateJobResult {
  success: boolean;
  timestamp: string;
  totalVolunteersChecked: number;
  totalStatusChanges: number;
  statusChanges: VolunteerStatusResult[];
  errors?: string[];
}

/**
 * Process all volunteers and update their status based on activity
 * @returns Job execution result with statistics
 */
export async function updateVolunteerStatuses(): Promise<StatusUpdateJobResult> {
  const startTime = new Date();
  const result: StatusUpdateJobResult = {
    success: true,
    timestamp: startTime.toISOString(),
    totalVolunteersChecked: 0,
    totalStatusChanges: 0,
    statusChanges: [],
    errors: []
  };

  try {
    console.log('[Volunteer Status Job] Starting volunteer status update job...');

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Fetch all volunteers
    const { data: volunteers, error: volunteersError } = await supabaseServiceRole
      .from('volunteers')
      .select('id, full_name, status');

    if (volunteersError) {
      const errorMsg = `Failed to fetch volunteers: ${volunteersError.message}`;
      console.error(`[Volunteer Status Job] ${errorMsg}`);
      result.success = false;
      result.errors?.push(errorMsg);
      return result;
    }

    if (!volunteers || volunteers.length === 0) {
      console.log('[Volunteer Status Job] No volunteers found');
      return result;
    }

    console.log(
      `[Volunteer Status Job] Checking ${volunteers.length} volunteers`
    );

    result.totalVolunteersChecked = volunteers.length;

    // Process each volunteer
    for (const volunteer of volunteers) {
      try {
        // Check if volunteer has any incomplete tasks
        const { data: incompleteTaskAssignments, error: incompleteError } = 
          await supabaseServiceRole
            .from('task_assignments')
            .select(`
              id,
              tasks!inner(id, status)
            `)
            .eq('volunteer_id', volunteer.id)
            .neq('tasks.status', 'Completed');

        if (incompleteError) {
          console.error(
            `[Volunteer Status Job] Error checking incomplete tasks for volunteer ${volunteer.id}:`,
            incompleteError
          );
          continue;
        }

        const hasIncompleteTasks = incompleteTaskAssignments && incompleteTaskAssignments.length > 0;

        // Check last assignment date
        const { data: recentAssignments, error: recentError } = 
          await supabaseServiceRole
            .from('task_assignments')
            .select('assigned_at')
            .eq('volunteer_id', volunteer.id)
            .gte('assigned_at', sevenDaysAgoISO);

        if (recentError) {
          console.error(
            `[Volunteer Status Job] Error checking recent assignments for volunteer ${volunteer.id}:`,
            recentError
          );
          continue;
        }

        const hasRecentAssignment = recentAssignments && recentAssignments.length > 0;

        // Determine the correct status
        let newStatus: string;
        let reason: string;

        if (hasIncompleteTasks) {
          // Rule: Volunteer remains Active if they have ongoing incomplete tasks
          newStatus = 'Active';
          reason = 'Has ongoing incomplete tasks';
        } else if (hasRecentAssignment) {
          // Rule: Volunteer is Active if assigned to tasks in last 7 days
          newStatus = 'Active';
          reason = 'Recent task assignment (within 7 days)';
        } else {
          // Rule: Volunteer is Inactive if no assignments in 7+ days and no incomplete tasks
          newStatus = 'Inactive';
          reason = 'No task assignments for 7+ days and no incomplete tasks';
        }

        // Update status if it changed
        if (volunteer.status !== newStatus) {
          const { error: updateError } = await supabaseServiceRole
            .from('volunteers')
            .update({ status: newStatus })
            .eq('id', volunteer.id);

          if (updateError) {
            console.error(
              `[Volunteer Status Job] Failed to update status for volunteer ${volunteer.id}:`,
              updateError
            );
            result.errors?.push(
              `Failed to update volunteer ${volunteer.id}: ${updateError.message}`
            );
            continue;
          }

          result.totalStatusChanges++;
          result.statusChanges.push({
            volunteerId: volunteer.id,
            volunteerName: volunteer.full_name,
            previousStatus: volunteer.status,
            newStatus: newStatus,
            reason: reason
          });

          console.log(
            `[Volunteer Status Job] Updated ${volunteer.full_name} (ID: ${volunteer.id}): ${volunteer.status} → ${newStatus} (${reason})`
          );
        } else {
          console.log(
            `[Volunteer Status Job] ${volunteer.full_name} (ID: ${volunteer.id}): Status unchanged (${volunteer.status}) - ${reason}`
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[Volunteer Status Job] Error processing volunteer ${volunteer.id}:`,
          errorMsg
        );
        result.errors?.push(`Error processing volunteer ${volunteer.id}: ${errorMsg}`);
      }
    }

    const duration = (Date.now() - startTime.getTime()) / 1000;
    console.log(
      `[Volunteer Status Job] Job completed in ${duration}s. Checked ${result.totalVolunteersChecked} volunteers, made ${result.totalStatusChanges} status changes.`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Volunteer Status Job] Fatal error:', errorMsg);
    result.success = false;
    result.errors?.push(`Fatal error: ${errorMsg}`);
  }

  return result;
}

/**
 * Get summary statistics for the last job run
 */
export function getStatusJobSummary(result: StatusUpdateJobResult): string {
  return `
Volunteer Status Update Job Summary:
- Timestamp: ${result.timestamp}
- Volunteers Checked: ${result.totalVolunteersChecked}
- Status Changes: ${result.totalStatusChanges}
- Status: ${result.success ? 'Success' : 'Failed'}
${result.statusChanges.length > 0 ? `\nChanges:\n${result.statusChanges.map(c => `  • ${c.volunteerName}: ${c.previousStatus} → ${c.newStatus} (${c.reason})`).join('\n')}` : ''}
${result.errors && result.errors.length > 0 ? `\nErrors: ${result.errors.join(', ')}` : ''}
  `.trim();
}
