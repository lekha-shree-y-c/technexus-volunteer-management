/**
 * Email tracking utility to prevent sending duplicate reminder emails
 * Uses in-memory Map with date-based tracking
 */

interface EmailSendRecord {
  timestamp: number;
  messageId: string;
}

// In-memory cache for email sending records
// Key: "taskId-volunteerId-date"
const emailSendCache = new Map<string, EmailSendRecord>();

/**
 * Generate cache key for email tracking
 * @param taskId - Task ID
 * @param volunteerId - Volunteer ID
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 */
function getCacheKey(
  taskId: number,
  volunteerId: number,
  date: string = new Date().toISOString().split('T')[0]
): string {
  return `${taskId}-${volunteerId}-${date}`;
}

/**
 * Check if an email has already been sent today for this task
 * @param taskId - Task ID
 * @param volunteerId - Volunteer ID
 * @returns true if email was already sent today
 */
export function hasEmailBeenSentToday(
  taskId: number,
  volunteerId: number
): boolean {
  const key = getCacheKey(taskId, volunteerId);
  const record = emailSendCache.get(key);

  if (!record) return false;

  // Check if record is from today
  const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
  const todayDate = new Date().toISOString().split('T')[0];

  return recordDate === todayDate;
}

/**
 * Mark an email as sent for today
 * @param taskId - Task ID
 * @param volunteerId - Volunteer ID
 * @param messageId - Brevo message ID
 */
export function recordEmailSent(
  taskId: number,
  volunteerId: number,
  messageId: string
): void {
  const key = getCacheKey(taskId, volunteerId);
  emailSendCache.set(key, {
    timestamp: Date.now(),
    messageId
  });
}

/**
 * Clear old records from cache (optional cleanup)
 * Removes entries older than 30 days
 */
export function cleanupOldRecords(): void {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const [key, record] of emailSendCache.entries()) {
    if (record.timestamp < thirtyDaysAgo) {
      emailSendCache.delete(key);
    }
  }
}

/**
 * Get the sent message ID if email was sent
 * @param taskId - Task ID
 * @param volunteerId - Volunteer ID
 * @returns Message ID or null
 */
export function getSentMessageId(
  taskId: number,
  volunteerId: number
): string | null {
  const key = getCacheKey(taskId, volunteerId);
  return emailSendCache.get(key)?.messageId || null;
}
