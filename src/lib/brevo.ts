/**
 * Brevo (Sendinblue) API client for transactional emails
 */

const BREVO_API_BASE_URL = 'https://api.brevo.com/v3';

interface BrevoHtmlEmailPayload {
  to: Array<{ email: string }>;
  sender?: {
    email: string;
    name: string;
  };
  subject: string;
  htmlContent: string;
}

type BrevoResponseLike = {
  text: () => Promise<string>;
};

async function parseBrevoResponse(response: BrevoResponseLike): Promise<unknown> {
  const rawBody = await response.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { rawBody };
  }
}

function extractMessageId(data: unknown): string {
  if (data && typeof data === 'object' && 'messageId' in data) {
    const messageId = (data as { messageId?: unknown }).messageId;
    if (typeof messageId === 'string' && messageId.trim().length > 0) {
      return messageId;
    }
  }

  throw new Error(`Brevo API did not return a valid messageId: ${JSON.stringify(data)}`);
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

  const data = await parseBrevoResponse(response);

  if (!response.ok) {
    throw new Error(
      `Brevo API error: ${response.status} - ${JSON.stringify(data)}`
    );
  }

  return extractMessageId(data);
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

/**
 * Send a reminder email listing multiple incomplete tasks for a volunteer
 * @param volunteerEmail - Recipient email address
 * @param volunteerName - Volunteer full name
 * @param tasks - Incomplete tasks to include in the reminder
 * @param templateId - Brevo template ID (default: BREVO_REMINDER_TEMPLATE_ID or 1)
 * @returns Message ID from Brevo
 */
export async function sendVolunteerReminderEmail(
  volunteerEmail: string,
  volunteerName: string,
  tasks: Array<{ id: string | number; title: string; due_date?: string | null }>,
  templateId: number = Number(process.env.BREVO_REMINDER_TEMPLATE_ID || 1)
): Promise<string> {
  const taskList = tasks
    .map((task) => {
      const dueDate = task.due_date ? ` (Due: ${task.due_date})` : '';
      return `- ${task.title}${dueDate}`;
    })
    .join('\n');

  const params = {
    volunteer_name: volunteerName,
    task_count: tasks.length,
    task_list: taskList,
    VOLUNTEER_NAME: volunteerName,
    TASK_COUNT: tasks.length,
    TASK_LIST: taskList
  };

  return sendBrevoEmail(templateId, volunteerEmail, params);
}
/**
 * Send an email with custom HTML content (without using a template)
 * @param email - Recipient email address
 * @param subject - Email subject line
 * @param htmlContent - HTML email body
 * @param fromEmail - Sender email address (optional, defaults to BREVO_SENDER_EMAIL)
 * @returns Message ID from Brevo
 */
export async function sendBrevoEmailWithHtml(
  email: string,
  subject: string,
  htmlContent: string,
  fromEmail?: string
): Promise<string> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }

  const senderEmail = fromEmail || process.env.BREVO_SENDER_EMAIL || 'noreply@volunteerapp.com';

  const payload: BrevoHtmlEmailPayload = {
    to: [{ email }],
    sender: {
      email: senderEmail,
      name: 'Volunteer Management System'
    },
    subject,
    htmlContent
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

  const data = await parseBrevoResponse(response);

  if (!response.ok) {
    throw new Error(
      `Brevo API error: ${response.status} - ${JSON.stringify(data)}`
    );
  }

  return extractMessageId(data);
}
