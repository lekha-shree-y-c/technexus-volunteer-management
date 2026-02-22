-- Test query to check volunteers table
SELECT 
  id, 
  full_name, 
  email, 
  status, 
  role, 
  place, 
  joining_date, 
  avatar_url
FROM volunteers
LIMIT 5;

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'volunteers';

-- Check row counts by status
SELECT status, COUNT(*) as count
FROM volunteers
GROUP BY status;
