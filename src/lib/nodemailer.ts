/**
 * Nodemailer utility for sending admin emails
 * Uses Gmail SMTP or any other SMTP service
 */

import nodemailer from 'nodemailer';

/**
 * Send an email using nodemailer (for admin notifications)
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - HTML email body
 * @returns Success status
 */
export async function sendEmailViaNodemailer(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  try {
    // Create transporter with Gmail SMTP (or your preferred SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use Gmail SMTP
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Volunteer Management System" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent
    });

    console.log(`[Nodemailer] Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('[Nodemailer] Error sending email:', err.message);
    return false;
  }
}

/**
 * Send overdue task alert email to admin
 * @param adminEmail - Admin email address
 * @param taskTitle - Task title
 * @param volunteerName - Volunteer name
 * @param volunteerEmail - Volunteer email
 * @param dueDate - Task due date
 * @returns Success status
 */
export async function sendOverdueTaskAlertToAdmin(
  adminEmail: string,
  taskTitle: string,
  volunteerName: string,
  volunteerEmail: string,
  dueDate: string
): Promise<boolean> {
  const subject = '⚠️ Overdue Task Alert';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #d32f2f; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
.header h2 { margin: 0; }
.content { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
.alert-box { background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 15px 0; }
.info-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px; }
.label { font-weight: bold; color: #d32f2f; display: inline-block; width: 120px; }
.footer { color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; }
a { color: #d32f2f; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2>⚠️ Overdue Task Alert</h2>
</div>
<div class="content">
<p>Hello Admin,</p>
<p>The following task is <strong>OVERDUE</strong> and still incomplete:</p>
<div class="alert-box">
<div class="info-row"><span class="label">Task:</span> ${taskTitle}</div>
<div class="info-row"><span class="label">Volunteer:</span> ${volunteerName}</div>
<div class="info-row"><span class="label">Email:</span> <a href="mailto:${volunteerEmail}">${volunteerEmail}</a></div>
<div class="info-row"><span class="label">Due Date:</span> ${dueDate}</div>
</div>
<p>This task was expected to be completed by <strong>${dueDate}</strong> but remains incomplete.</p>
<p>Please follow up with the assigned volunteer to ensure timely completion.</p>
</div>
<div class="footer">
<p>This is an automated message from the Volunteer Management System.</p>
</div>
</div>
</body>
</html>
  `;

  return sendEmailViaNodemailer(adminEmail, subject, htmlContent);
}
