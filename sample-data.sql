-- Sample data for Volunteer Management System

-- Insert sample volunteers
INSERT INTO volunteers (full_name, role, place, status, joining_date, avatar_url) VALUES
('Alice Johnson', 'Event Coordinator', 'Chicago', 'Active', '2024-01-15', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
('Bob Smith', 'Tech Support', 'New York', 'Active', '2024-02-20', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
('Carol Davis', 'Community Outreach', 'San Francisco', 'Active', '2024-03-10', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol'),
('David Wilson', 'Volunteer Coordinator', 'Austin', 'Active', '2024-01-05', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'),
('Eva Martinez', 'Fundraising Lead', 'Miami', 'Inactive', '2023-12-01', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eva'),
('Frank Garcia', 'Social Media Manager', 'Seattle', 'Active', '2024-04-12', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank');

-- Insert sample tasks
INSERT INTO tasks (title, description, due_date, status) VALUES
('Organize Charity Event', 'Plan and execute the annual charity gala including venue booking, guest list, and entertainment.', '2024-12-15', 'Pending'),
('Website Maintenance', 'Update the organization website with new volunteer opportunities and event information.', '2024-11-30', 'Pending'),
('Community Outreach Program', 'Develop and implement a program to reach out to local schools for volunteer recruitment.', '2024-12-01', 'Completed'),
('Fundraising Campaign', 'Launch a social media fundraising campaign to support local shelters.', '2024-11-20', 'Pending'),
('Volunteer Training Session', 'Conduct training sessions for new volunteers on organization policies and procedures.', '2024-11-25', 'Completed');

-- Insert task assignments
INSERT INTO task_assignments (task_id, volunteer_id) VALUES
(1, 1), -- Alice on Charity Event
(1, 2), -- Bob on Charity Event
(2, 2), -- Bob on Website Maintenance
(2, 6), -- Frank on Website Maintenance
(3, 3), -- Carol on Community Outreach
(3, 4), -- David on Community Outreach
(4, 5), -- Eva on Fundraising (even though inactive)
(4, 6), -- Frank on Fundraising
(5, 1), -- Alice on Training
(5, 4); -- David on Training