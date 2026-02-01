/**
 * Brevo (Sendinblue) API client for transactional emails
 */

const BREVO_API_BASE_URL = 'https://api.brevo.com/v3';

interface BrevoEmailRequest {
  templateId: number;
  email: string;
  customEmail?: string;
  params: Record<string, string | number>;
}

interface BrevoEmailResponse {
  messageId: string;
}

/**
 * Send a transactional email using Brevo API
 * @param templateId - Brevo template ID
 * @param email - Recipient email address
 * @param params - Template parameters
 * @returns Message ID from Brevo
 */
export async function sendBrevoEmail(
  templateId: number,
  email: string,
  params: Record<string, string | number>
): Promise<string> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }

  const payload = {
    to: [{ email }],
    templateId,
    params
  };

  const response = await fetch(`${BREVO_API_BASE_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as BrevoEmailResponse;
  return data.messageId;
}

/**
 * Send a task reminder email to a volunteer
 * @param taskId - Task ID
 * @param volunteerId - Volunteer ID
 * @param volunteerEmail - Volunteer email address
 * @param volunteerName - Volunteer full name
 * @param taskTitle - Task title
 * @param dueDate - Task due date
 * @param templateId - Brevo template ID (default: 1)
 * @returns Message ID from Brevo
 */
export async function sendTaskReminderEmail(
  taskId: string,
  volunteerId: string,
  volunteerEmail: string,
  volunteerName: string,
  taskTitle: string,
  dueDate: string,
  templateId: number = 1
): Promise<string> {
  const params = {
    volunteers_name: volunteerName,
    task_name: taskTitle,
    due_date: dueDate,
    volunteer_name: volunteerName,
    task_title: taskTitle,
    VOLUNTEER_NAME: volunteerName,
    TASK_TITLE: taskTitle,
    DUE_DATE: dueDate,
    TASK_ID: taskId.toString(),
    VOLUNTEER_ID: volunteerId.toString(),
    task_id: taskId.toString(),
    volunteer_id: volunteerId.toString()
  };

  return sendBrevoEmail(templateId, volunteerEmail, params);
}
