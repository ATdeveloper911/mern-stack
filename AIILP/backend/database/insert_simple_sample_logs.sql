-- ============================================
-- Simple Sample Admin Logs Insert
-- ============================================
-- Quick test: Insert logs directly (replace YOUR_ADMIN_ID with your admin UUID)

-- Step 1: Get your admin user ID
-- Run this first to find your admin ID:
SELECT id, role, full_name, email 
FROM profiles 
WHERE role = 'admin' 
LIMIT 1;

-- Step 2: Replace 'YOUR_ADMIN_ID_HERE' below with the UUID from Step 1
-- Then run the INSERT statements below

-- Example: If your admin ID is '34f0d3ee-b378-48e0-92db-39fbc63a0966'
-- Replace 'YOUR_ADMIN_ID_HERE' with that UUID

INSERT INTO admin_logs (admin_id, action, target_type, target_id, feedback, timestamp)
VALUES
  ('YOUR_ADMIN_ID_HERE', 'admin_login', 'system', 'YOUR_ADMIN_ID_HERE', 'Admin logged in', NOW() - INTERVAL '1 hour'),
  ('YOUR_ADMIN_ID_HERE', 'approve_account', 'profile', gen_random_uuid(), 'Account approved', NOW() - INTERVAL '2 hours'),
  ('YOUR_ADMIN_ID_HERE', 'approve_internship', 'internship', gen_random_uuid(), 'Internship approved', NOW() - INTERVAL '3 hours'),
  ('YOUR_ADMIN_ID_HERE', 'reject_account', 'profile', gen_random_uuid(), 'Account rejected: incomplete info', NOW() - INTERVAL '4 hours'),
  ('YOUR_ADMIN_ID_HERE', 'admin_logout', 'system', 'YOUR_ADMIN_ID_HERE', 'Admin logged out', NOW() - INTERVAL '30 minutes'),
  ('YOUR_ADMIN_ID_HERE', 'upload_profile_picture', 'profile', 'YOUR_ADMIN_ID_HERE', 'Profile picture uploaded', NOW() - INTERVAL '15 minutes'),
  ('YOUR_ADMIN_ID_HERE', 'activate_account', 'profile', gen_random_uuid(), 'Account activated', NOW() - INTERVAL '5 hours'),
  ('YOUR_ADMIN_ID_HERE', 'approve_internship', 'internship', gen_random_uuid(), 'New internship published', NOW() - INTERVAL '6 hours'),
  ('YOUR_ADMIN_ID_HERE', 'admin_login', 'system', 'YOUR_ADMIN_ID_HERE', 'Admin logged in', NOW() - INTERVAL '10 minutes'),
  ('YOUR_ADMIN_ID_HERE', 'approve_account', 'profile', gen_random_uuid(), 'Software house approved', NOW() - INTERVAL '1 day');

-- Verify logs were inserted
SELECT COUNT(*) as total_logs FROM admin_logs;

-- View the logs
SELECT 
  id,
  action,
  target_type,
  feedback,
  timestamp
FROM admin_logs
ORDER BY timestamp DESC
LIMIT 10;

