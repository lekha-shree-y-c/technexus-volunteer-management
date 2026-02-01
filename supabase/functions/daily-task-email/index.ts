import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
}

interface Volunteer {
  id: number;
  full_name: string;
  email: string | null;
}

interface TaskAssignment {
  task_id: number;
  volunteer_id: number;
  completed: boolean;
  tasks: Task;
  volunteers: Volunteer;
}

interface EmailLog {
  task_id: number;
  task_title: string;
  volunteer_name: string;
  volunteer_email: string;
  status: "sent" | "skipped" | "error";
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting daily task email process...");

    // Step 1: Fetch all tasks where status != "completed"
    const { data: incompleteTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .neq("status", "Completed");

    if (tasksError) {
      throw new Error(`Error fetching tasks: ${tasksError.message}`);
    }

    console.log(`Found ${incompleteTasks?.length || 0} incomplete tasks`);

    const emailLogs: EmailLog[] = [];

    // Step 2: For each task, fetch assigned volunteers
    if (incompleteTasks && incompleteTasks.length > 0) {
      for (const task of incompleteTasks) {
        // Fetch task assignments with volunteer details
        const { data: assignments, error: assignmentsError } = await supabase
          .from("task_assignments")
          .select(`
            task_id,
            volunteer_id,
            completed,
            tasks (
              id,
              title,
              description,
              due_date,
              status
            ),
            volunteers (
              id,
              full_name,
              email
            )
          `)
          .eq("task_id", task.id);

        if (assignmentsError) {
          console.error(
            `Error fetching assignments for task ${task.id}:`,
            assignmentsError
          );
          continue;
        }

        if (!assignments || assignments.length === 0) {
          emailLogs.push({
            task_id: task.id,
            task_title: task.title,
            volunteer_name: "N/A",
            volunteer_email: "N/A",
            status: "skipped",
            reason: "No volunteers assigned",
          });
          continue;
        }

        // Step 3 & 4: Send email to each assigned volunteer
        for (const assignment of assignments as unknown as TaskAssignment[]) {
          const volunteer = assignment.volunteers;
          const taskData = assignment.tasks;

          // Skip if volunteer has no email
          if (!volunteer.email) {
            emailLogs.push({
              task_id: taskData.id,
              task_title: taskData.title,
              volunteer_name: volunteer.full_name,
              volunteer_email: "N/A",
              status: "skipped",
              reason: "No email address",
            });
            continue;
          }

          // Skip if task is already completed (double-check)
          if (taskData.status === "Completed") {
            emailLogs.push({
              task_id: taskData.id,
              task_title: taskData.title,
              volunteer_name: volunteer.full_name,
              volunteer_email: volunteer.email,
              status: "skipped",
              reason: "Task already completed",
            });
            continue;
          }

          // Step 3: Build email message
          const subject = `Task Reminder – ${taskData.title}`;
          const dueDateFormatted = taskData.due_date
            ? new Date(taskData.due_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "No due date set";

          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                .task-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .label { font-weight: bold; color: #6b7280; margin-top: 15px; }
                .value { margin-top: 5px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Task Reminder</h2>
                </div>
                <div class="content">
                  <p>Hello <strong>${volunteer.full_name}</strong>,</p>
                  <p>This is a friendly reminder about your assigned task:</p>
                  
                  <div class="task-details">
                    <div class="label">Task Title:</div>
                    <div class="value"><strong>${taskData.title}</strong></div>
                    
                    <div class="label">Description:</div>
                    <div class="value">${taskData.description || "No description provided"}</div>
                    
                    <div class="label">Due Date:</div>
                    <div class="value">${dueDateFormatted}</div>
                    
                    <div class="label">Current Status:</div>
                    <div class="value">${taskData.status}</div>
                  </div>
                  
                  <p>Please ensure this task is completed by the due date. If you have any questions or need assistance, please reach out to your coordinator.</p>
                  
                  <p>Thank you for your dedication!</p>
                  
                  <div class="footer">
                    <p>This is an automated reminder from the Volunteer Management System.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          // Step 4: Send email using Brevo SMTP API
          try {
            const brevoResponse = await fetch(
              "https://api.brevo.com/v3/smtp/email",
              {
                method: "POST",
                headers: {
                  "accept": "application/json",
                  "api-key": brevoApiKey,
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  sender: {
                    name: "Volunteer Management System",
                    email: "noreply@volunteerapp.com", // Replace with your verified sender email
                  },
                  to: [
                    {
                      email: volunteer.email,
                      name: volunteer.full_name,
                    },
                  ],
                  subject: subject,
                  htmlContent: htmlContent,
                }),
              }
            );

            if (brevoResponse.ok) {
              const brevoData = await brevoResponse.json();
              console.log(
                `Email sent successfully to ${volunteer.email} for task "${taskData.title}"`
              );
              emailLogs.push({
                task_id: taskData.id,
                task_title: taskData.title,
                volunteer_name: volunteer.full_name,
                volunteer_email: volunteer.email,
                status: "sent",
              });
            } else {
              const errorText = await brevoResponse.text();
              console.error(
                `Failed to send email to ${volunteer.email}:`,
                errorText
              );
              emailLogs.push({
                task_id: taskData.id,
                task_title: taskData.title,
                volunteer_name: volunteer.full_name,
                volunteer_email: volunteer.email,
                status: "error",
                reason: `Brevo API error: ${errorText}`,
              });
            }
          } catch (emailError) {
            console.error(
              `Error sending email to ${volunteer.email}:`,
              emailError
            );
            emailLogs.push({
              task_id: taskData.id,
              task_title: taskData.title,
              volunteer_name: volunteer.full_name,
              volunteer_email: volunteer.email,
              status: "error",
              reason: emailError instanceof Error ? emailError.message : "Unknown error",
            });
          }
        }
      }
    }

    // Step 7: Return logs
    const summary = {
      total_incomplete_tasks: incompleteTasks?.length || 0,
      emails_sent: emailLogs.filter((log) => log.status === "sent").length,
      emails_skipped: emailLogs.filter((log) => log.status === "skipped")
        .length,
      emails_failed: emailLogs.filter((log) => log.status === "error").length,
      logs: emailLogs,
    };

    console.log("Email sending process completed:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in daily-task-email function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
