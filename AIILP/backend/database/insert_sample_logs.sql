-- ============================================
-- Insert Sample Admin Logs for Testing
-- ============================================
-- This script inserts sample logs to test the Activity Logs functionality
-- Replace 'YOUR_ADMIN_USER_ID' with your actual admin user ID

-- First, get your admin user ID (run this query first to get your admin ID)
-- SELECT id, role FROM profiles WHERE role = 'admin' LIMIT 1;

-- Replace 'YOUR_ADMIN_USER_ID' below with the UUID from the query above
-- Or use this to automatically get the first admin user:
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Get the first admin user ID
  SELECT id INTO v_admin_id 
  FROM profiles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Please create an admin user first.';
  END IF;
  
  RAISE NOTICE 'Using admin ID: %', v_admin_id;
  
  -- Insert sample logs
  -- Note: If target_type and metadata columns don't exist, use insert_sample_logs_fixed.sql instead
  INSERT INTO admin_logs (admin_id, action, target_type, target_id, feedback, metadata, timestamp)
  VALUES
    -- Account approvals
    (v_admin_id, 'approve_account', 'profile', gen_random_uuid(), 'Account approved after review', '{"reason": "verified_credentials"}'::jsonb, NOW() - INTERVAL '2 hours'),
    (v_admin_id, 'approve_account', 'profile', gen_random_uuid(), 'Software house account approved', '{"company": "Tech Solutions Inc"}'::jsonb, NOW() - INTERVAL '5 hours'),
    (v_admin_id, 'reject_account', 'profile', gen_random_uuid(), 'Incomplete registration information', '{"reason": "missing_documents"}'::jsonb, NOW() - INTERVAL '1 day'),
    
    -- Account management
    (v_admin_id, 'activate_account', 'profile', gen_random_uuid(), 'Account reactivated', NULL, NOW() - INTERVAL '3 hours'),
    (v_admin_id, 'deactivate_account', 'profile', gen_random_uuid(), 'Account deactivated due to policy violation', '{"violation": "spam"}'::jsonb, NOW() - INTERVAL '6 hours'),
    
    -- Internship management
    (v_admin_id, 'approve_internship', 'internship', gen_random_uuid(), 'Internship approved and published', '{"title": "Frontend Developer Internship"}'::jsonb, NOW() - INTERVAL '4 hours'),
    (v_admin_id, 'approve_internship', 'internship', gen_random_uuid(), 'Backend Developer position approved', '{"title": "Backend Developer Internship"}'::jsonb, NOW() - INTERVAL '8 hours'),
    (v_admin_id, 'reject_internship', 'internship', gen_random_uuid(), 'Internship rejected: insufficient details', '{"title": "Unnamed Position"}'::jsonb, NOW() - INTERVAL '12 hours'),
    
    -- System actions
    (v_admin_id, 'admin_login', 'system', v_admin_id, 'Admin logged in successfully', '{"ip": "192.168.1.100", "browser": "Chrome"}'::jsonb, NOW() - INTERVAL '30 minutes'),
    (v_admin_id, 'admin_logout', 'system', v_admin_id, 'Admin logged out', '{"session_duration": "2h 15m"}'::jsonb, NOW() - INTERVAL '1 hour'),
    
    -- Profile updates
    (v_admin_id, 'upload_profile_picture', 'profile', v_admin_id, 'Profile picture updated', '{"file_size": "245KB"}'::jsonb, NOW() - INTERVAL '15 minutes'),
    (v_admin_id, 'update_account_status', 'profile', gen_random_uuid(), 'Account status updated', '{"old_status": "pending", "new_status": "approved"}'::jsonb, NOW() - INTERVAL '2 days'),
    
    -- More recent actions
    (v_admin_id, 'approve_account', 'profile', gen_random_uuid(), 'Guest user account approved', NULL, NOW() - INTERVAL '10 minutes'),
    (v_admin_id, 'approve_internship', 'internship', gen_random_uuid(), 'Data Science Internship approved', '{"title": "Data Science Internship", "duration": "6 months"}'::jsonb, NOW() - INTERVAL '20 minutes'),
    (v_admin_id, 'admin_login', 'system', v_admin_id, 'Admin logged in', '{"ip": "192.168.1.101"}'::jsonb, NOW() - INTERVAL '5 minutes');
  
  RAISE NOTICE 'Successfully inserted 15 sample log entries';
END $$;

-- Verify the logs were inserted
SELECT 
  id,
  action,
  target_id,
  feedback,
  timestamp,
  (SELECT full_name FROM profiles WHERE id = admin_logs.admin_id) as admin_name
FROM admin_logs
ORDER BY timestamp DESC
LIMIT 20;

