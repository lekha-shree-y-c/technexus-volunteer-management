-- Supabase SQL Schema for Volunteer Management System

-- Volunteers table
CREATE TABLE volunteers (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  place TEXT,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive')),
  joining_date DATE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task assignments table
CREATE TABLE task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  volunteer_id INTEGER REFERENCES volunteers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(task_id, volunteer_id)
);

-- Email tracking table
-- Tracks which emails have been sent to prevent duplicate reminders on the same day
CREATE TABLE email_tracking (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  volunteer_id INTEGER REFERENCES volunteers(id) ON DELETE CASCADE,
  email_sent_date TIMESTAMP WITH TIME ZONE NOT NULL,
  brevo_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, volunteer_id, DATE(email_sent_date))
);