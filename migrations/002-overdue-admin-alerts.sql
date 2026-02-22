-- Migration: Add overdue_admin_alerts table for tracking admin notifications
-- This table tracks which overdue task alerts have been sent to admins
-- to prevent duplicate notifications

CREATE TABLE IF NOT EXISTS overdue_admin_alerts (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  volunteer_id INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  alert_sent BOOLEAN DEFAULT TRUE,
  alert_sent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure we only send one alert per task-volunteer pair to each admin
  UNIQUE(task_id, volunteer_id, admin_email)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_overdue_admin_alerts_task_volunteer 
  ON overdue_admin_alerts(task_id, volunteer_id);

CREATE INDEX IF NOT EXISTS idx_overdue_admin_alerts_sent 
  ON overdue_admin_alerts(alert_sent, alert_sent_date);
