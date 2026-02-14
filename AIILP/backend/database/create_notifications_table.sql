-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'user_approval', 'internship_approval', 'application_status', 'new_application'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_id UUID, -- ID of related entity (profile_id, internship_id, application_id)
  related_type VARCHAR(50), -- 'profile', 'internship', 'application'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- Additional data like feedback, status, etc.
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to get unread count (all notifications)
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = user_uuid AND is_read = FALSE;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get unread count filtered by role
CREATE OR REPLACE FUNCTION get_unread_notification_count_by_role(user_uuid UUID, user_role TEXT)
RETURNS INTEGER AS $$
DECLARE
  allowed_types TEXT[];
BEGIN
  -- Determine allowed notification types based on role
  CASE user_role
    WHEN 'admin' THEN
      allowed_types := ARRAY['user_approval', 'internship_approval'];
    WHEN 'software_house' THEN
      allowed_types := ARRAY['internship_approval', 'new_application'];
    WHEN 'student', 'guest' THEN
      allowed_types := ARRAY['application_status'];
    ELSE
      allowed_types := ARRAY[]::TEXT[];
  END CASE;

  -- Return count of unread notifications matching allowed types
  -- For admin: only count internship_approval with status = 'pending'
  -- For software_house: only count approved/rejected internship_approval (exclude pending)
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = user_uuid 
      AND is_read = FALSE
      AND (
        -- For admin: only count user_approval OR pending internship_approval
        (user_role = 'admin' AND (
          type = 'user_approval' 
          OR (type = 'internship_approval' AND metadata->>'status' = 'pending')
        ))
        OR
        -- For software_house: only count approved/rejected internship_approval OR new_application
        (user_role = 'software_house' AND (
          type = 'new_application'
          OR (type = 'internship_approval' AND (metadata->>'status' = 'approved' OR metadata->>'status' = 'rejected'))
        ))
        OR
        -- For other roles: count all allowed types
        (user_role NOT IN ('admin', 'software_house') AND (
          array_length(allowed_types, 1) IS NULL OR type = ANY(allowed_types)
        ))
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count_by_role(UUID, TEXT) TO authenticated;

