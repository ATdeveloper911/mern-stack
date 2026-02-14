-- ============================================
-- Insert Sample Admin Logs (Fixed for Current Table Structure)
-- ============================================
-- This script works with the current table structure (no target_type or metadata columns)
-- It automatically finds your admin user and inserts sample logs

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
  
  -- Insert sample logs (only using columns that exist: admin_id, action, target_id, feedback, timestamp)
  INSERT INTO admin_logs (admin_id, action, target_id, feedback, timestamp)
  VALUES
    -- Account approvals
    (v_admin_id, 'approve_account', gen_random_uuid(), 'Account approved after review - verified credentials', NOW() - INTERVAL '2 hours'),
    (v_admin_id, 'approve_account', gen_random_uuid(), 'Software house account approved - Tech Solutions Inc', NOW() - INTERVAL '5 hours'),
    (v_admin_id, 'reject_account', gen_random_uuid(), 'Account rejected - Incomplete registration information', NOW() - INTERVAL '1 day'),
    
    -- Account management
    (v_admin_id, 'activate_account', gen_random_uuid(), 'Account reactivated', NOW() - INTERVAL '3 hours'),
    (v_admin_id, 'deactivate_account', gen_random_uuid(), 'Account deactivated due to policy violation', NOW() - INTERVAL '6 hours'),
    
    -- Internship management
    (v_admin_id, 'approve_internship', gen_random_uuid(), 'Internship approved - Frontend Developer Internship', NOW() - INTERVAL '4 hours'),
    (v_admin_id, 'approve_internship', gen_random_uuid(), 'Backend Developer position approved', NOW() - INTERVAL '8 hours'),
    (v_admin_id, 'reject_internship', gen_random_uuid(), 'Internship rejected - insufficient details', NOW() - INTERVAL '12 hours'),
    
    -- System actions
    (v_admin_id, 'admin_login', v_admin_id, 'Admin logged in successfully', NOW() - INTERVAL '30 minutes'),
    (v_admin_id, 'admin_logout', v_admin_id, 'Admin logged out', NOW() - INTERVAL '1 hour'),
    
    -- Profile updates
    (v_admin_id, 'upload_profile_picture', v_admin_id, 'Profile picture updated', NOW() - INTERVAL '15 minutes'),
    (v_admin_id, 'update_account_status', gen_random_uuid(), 'Account status updated from pending to approved', NOW() - INTERVAL '2 days'),
    
    -- More recent actions
    (v_admin_id, 'approve_account', gen_random_uuid(), 'Guest user account approved', NOW() - INTERVAL '10 minutes'),
    (v_admin_id, 'approve_internship', gen_random_uuid(), 'Data Science Internship approved', NOW() - INTERVAL '20 minutes'),
    (v_admin_id, 'admin_login', v_admin_id, 'Admin logged in', NOW() - INTERVAL '5 minutes');
  
  RAISE NOTICE 'Successfully inserted 15 sample log entries';
END $$;

-- Verify the logs were inserted
SELECT 
  id,
  action,
  target_id,
  feedback,
  timestamp
FROM admin_logs
ORDER BY timestamp DESC
LIMIT 20;

