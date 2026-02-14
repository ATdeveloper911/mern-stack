-- Script to populate notifications for existing records
-- This creates notifications for data that already exists in the database

-- 1. Create notifications for admin about pending accounts (guest and software_house)
-- These notifications will appear in admin portal's "User Approval" tab
-- Creates notifications for ALL admins
INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read, created_at)
SELECT 
  admin.id,
  'user_approval',
  'New Account Pending Approval',
  CASE 
    WHEN p.role = 'software_house' THEN 
      COALESCE(p.organization_name, p.full_name, p.email) || ' (Software House) account is pending approval.'
    WHEN p.role = 'guest' THEN
      COALESCE(p.full_name, p.email) || ' (Guest) account is pending approval.'
    ELSE
      COALESCE(p.full_name, p.email) || ' account is pending approval.'
  END,
  p.id,
  'profile',
  jsonb_build_object(
    'status', 'pending',
    'role', p.role,
    'organization_name', p.organization_name,
    'full_name', p.full_name,
    'email', p.email
  ),
  false,
  p.created_at
FROM profiles p
CROSS JOIN profiles admin
WHERE p.role IN ('guest', 'software_house')
  AND p.approval_status = 'pending'
  AND admin.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_id = p.id 
    AND n.related_type = 'profile'
    AND n.type = 'user_approval'
    AND n.user_id = admin.id
  );

-- 2. Create notifications for admin about pending internships
-- These notifications will appear in admin portal's "Post Internship Approval" tab
-- Creates notifications for ALL admins
INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read, created_at)
SELECT 
  admin.id,
  'internship_approval',
  'Internship Approval',
  COALESCE(sh.organization_name, sh.full_name, sh.email, 'A software house') || 
  ' comes for approval for their internship "' || 
  COALESCE(i.title, 'Untitled') || '".',
  i.id,
  'internship',
  jsonb_build_object(
    'status', 'pending',
    'internship_title', i.title,
    'software_house_id', i.software_house_id,
    'software_house_name', COALESCE(sh.organization_name, sh.full_name, sh.email, 'A software house')
  ),
  false,
  i.created_at
FROM internships i
CROSS JOIN profiles admin
INNER JOIN profiles sh ON sh.id = i.software_house_id
WHERE i.status = 'pending'
  AND admin.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_id = i.id 
    AND n.related_type = 'internship'
    AND n.type = 'internship_approval'
    AND n.user_id = admin.id
    AND n.metadata->>'status' = 'pending'
  );

-- 3. Create notifications for software house about their approved/rejected internships
-- These notifications will appear in software house portal
INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read, created_at)
SELECT 
  i.software_house_id,
  'internship_approval',
  CASE 
    WHEN i.status = 'approved' THEN 'Internship Approved'
    WHEN i.status = 'rejected' THEN 'Internship Rejected'
    ELSE 'Internship Status Updated'
  END,
  CASE 
    WHEN i.status = 'approved' THEN 
      'Your internship "' || COALESCE(i.title, 'Untitled') || '" has been approved and is now visible to students.'
    WHEN i.status = 'rejected' THEN 
      'Your internship "' || COALESCE(i.title, 'Untitled') || '" has been rejected. ' || 
      COALESCE(i.feedback, 'Please review the requirements and submit again.')
    ELSE 
      'Your internship "' || COALESCE(i.title, 'Untitled') || '" status has been updated.'
  END,
  i.id,
  'internship',
  jsonb_build_object(
    'status', i.status,
    'internship_title', i.title,
    'feedback', i.feedback
  ),
  false,
  i.created_at
FROM internships i
WHERE i.status IN ('approved', 'rejected')
  AND i.software_house_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_id = i.id 
    AND n.related_type = 'internship'
    AND n.type = 'internship_approval'
    AND n.user_id = i.software_house_id
  );

-- 4. Create notifications for software house about existing applications
-- These notifications will appear in software house portal's "New Applications" tab
INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read, created_at)
SELECT 
  i.software_house_id,
  'new_application',
  'New Application Received',
  COALESCE(p.full_name, p.email, 'A student') || ' has applied for your internship "' || 
  COALESCE(i.title, 'Untitled') || '".',
  a.id,
  'application',
  jsonb_build_object(
    'internship_title', i.title,
    'student_name', COALESCE(p.full_name, p.email, 'A student'),
    'application_id', a.id
  ),
  false,
  a.applied_at
FROM applications a
INNER JOIN internships i ON i.id = a.internship_id
INNER JOIN profiles p ON p.id = a.user_id
WHERE i.software_house_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_id = a.id 
    AND n.related_type = 'application'
    AND n.type = 'new_application'
    AND n.user_id = i.software_house_id
  );

-- 5. Create notifications for students/guests about their application status
-- These notifications will appear in student/guest portal
INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read, created_at)
SELECT 
  a.user_id,
  'application_status',
  CASE 
    WHEN a.status = 'accepted' THEN 'Application Accepted'
    WHEN a.status = 'rejected' THEN 'Application Rejected'
    ELSE 'Application Status Updated'
  END,
  CASE 
    WHEN a.status = 'accepted' THEN 
      'Congratulations! Your application for "' || 
      COALESCE(i.title, 'the internship') || '" has been accepted.'
    WHEN a.status = 'rejected' THEN 
      'Your application for "' || 
      COALESCE(i.title, 'the internship') || '" has been rejected. ' ||
      COALESCE(a.feedback, 'Please try applying to other internships.')
    ELSE 
      'Your application for "' || 
      COALESCE(i.title, 'the internship') || '" status has been updated.'
  END,
  a.id,
  'application',
  jsonb_build_object(
    'status', a.status,
    'internship_title', i.title,
    'feedback', a.feedback
  ),
  false,
  a.updated_at
FROM applications a
INNER JOIN internships i ON i.id = a.internship_id
WHERE a.status IN ('accepted', 'rejected')
  AND a.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.related_id = a.id 
    AND n.related_type = 'application'
    AND n.type = 'application_status'
    AND n.user_id = a.user_id
  );

-- Note: The script above creates notifications for ALL admins about pending accounts and internships.
-- This ensures every admin sees the pending items that need their attention.

