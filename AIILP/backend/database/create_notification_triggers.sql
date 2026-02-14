-- Trigger function to create notification when profile approval status changes
CREATE OR REPLACE FUNCTION notify_profile_approval_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title VARCHAR(255);
  notification_message TEXT;
  user_role VARCHAR(50);
BEGIN
  -- Only trigger for guest and software_house roles
  IF NEW.role NOT IN ('guest', 'software_house') THEN
    RETURN NEW;
  END IF;

  -- Only trigger if approval_status actually changed
  IF OLD.approval_status = NEW.approval_status THEN
    RETURN NEW;
  END IF;

  -- Get user role for message
  user_role := NEW.role;

  -- Create notification based on approval status
  IF NEW.approval_status = 'approved' THEN
    notification_title := 'Account Approved';
    notification_message := 'Your ' || 
      CASE 
        WHEN user_role = 'software_house' THEN 'software house'
        WHEN user_role = 'guest' THEN 'guest'
        ELSE 'account'
      END || 
      ' account has been approved. You can now access all features.';
    
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata)
    VALUES (
      NEW.id,
      'user_approval',
      notification_title,
      notification_message,
      NEW.id,
      'profile',
      jsonb_build_object('status', 'approved', 'role', user_role)
    );
  ELSIF NEW.approval_status = 'rejected' THEN
    notification_title := 'Account Rejected';
    notification_message := 'Your ' || 
      CASE 
        WHEN user_role = 'software_house' THEN 'software house'
        WHEN user_role = 'guest' THEN 'guest'
        ELSE 'account'
      END || 
      ' account has been rejected. Please contact support for more information.';
    
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata)
    VALUES (
      NEW.id,
      'user_approval',
      notification_title,
      notification_message,
      NEW.id,
      'profile',
      jsonb_build_object('status', 'rejected', 'role', user_role)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile approval changes
DROP TRIGGER IF EXISTS trigger_notify_profile_approval ON profiles;
CREATE TRIGGER trigger_notify_profile_approval
  AFTER UPDATE OF approval_status ON profiles
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION notify_profile_approval_change();

-- Trigger function to create notification when internship status changes
CREATE OR REPLACE FUNCTION notify_internship_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title VARCHAR(255);
  notification_message TEXT;
  software_house_id UUID;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get software house ID
  software_house_id := NEW.software_house_id;

  -- Create notification for software house owner (only approved/rejected, not pending)
  IF NEW.status = 'approved' THEN
    -- Check if notification already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = software_house_id 
        AND type = 'internship_approval' 
        AND related_id = NEW.id 
        AND related_type = 'internship'
        AND metadata->>'status' = 'approved'
    ) THEN
      notification_title := 'Internship Approved';
      notification_message := 'Your internship "' || COALESCE(NEW.title, 'Untitled') || '" has been approved and is now visible to students.';
      
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read)
      VALUES (
        software_house_id,
        'internship_approval',
        notification_title,
        notification_message,
        NEW.id,
        'internship',
        jsonb_build_object('status', 'approved', 'internship_title', NEW.title),
        FALSE
      );
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    -- Check if notification already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = software_house_id 
        AND type = 'internship_approval' 
        AND related_id = NEW.id 
        AND related_type = 'internship'
        AND metadata->>'status' = 'rejected'
    ) THEN
      notification_title := 'Internship Rejected';
      notification_message := 'Your internship "' || COALESCE(NEW.title, 'Untitled') || '" has been rejected. ' || 
        COALESCE(NEW.feedback, 'Please review the requirements and submit again.');
      
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read)
      VALUES (
        software_house_id,
        'internship_approval',
        notification_title,
        notification_message,
        NEW.id,
        'internship',
        jsonb_build_object('status', 'rejected', 'internship_title', NEW.title, 'feedback', NEW.feedback),
        FALSE
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for internship status changes
DROP TRIGGER IF EXISTS trigger_notify_internship_status ON internships;
CREATE TRIGGER trigger_notify_internship_status
  AFTER UPDATE OF status ON internships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_internship_status_change();

-- Trigger function to create notification when application status changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title VARCHAR(255);
  notification_message TEXT;
  internship_title TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get internship title
  SELECT title INTO internship_title
  FROM internships
  WHERE id = NEW.internship_id;

  -- Create notification for student/guest (only if it doesn't already exist)
  IF NEW.status = 'accepted' THEN
    -- Check if notification already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = NEW.user_id 
        AND type = 'application_status' 
        AND related_id = NEW.id 
        AND related_type = 'application'
        AND metadata->>'status' = 'accepted'
    ) THEN
      notification_title := 'Application Accepted';
      notification_message := 'Congratulations! Your application for "' || 
        COALESCE(internship_title, 'the internship') || '" has been accepted.';
      
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read)
      VALUES (
        NEW.user_id,
        'application_status',
        notification_title,
        notification_message,
        NEW.id,
        'application',
        jsonb_build_object('status', 'accepted', 'internship_title', internship_title),
        FALSE
      );
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    -- Check if notification already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = NEW.user_id 
        AND type = 'application_status' 
        AND related_id = NEW.id 
        AND related_type = 'application'
        AND metadata->>'status' = 'rejected'
    ) THEN
      notification_title := 'Application Rejected';
      notification_message := 'Your application for "' || 
        COALESCE(internship_title, 'the internship') || '" has been rejected. ' ||
        COALESCE(NEW.feedback, 'Please try applying to other internships.');
      
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read)
      VALUES (
        NEW.user_id,
        'application_status',
        notification_title,
        notification_message,
        NEW.id,
        'application',
        jsonb_build_object('status', 'rejected', 'internship_title', internship_title, 'feedback', NEW.feedback),
        FALSE
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for application status changes
DROP TRIGGER IF EXISTS trigger_notify_application_status ON applications;
CREATE TRIGGER trigger_notify_application_status
  AFTER UPDATE OF status ON applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_application_status_change();

-- Trigger function to create notification when new application is created
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
DECLARE
  notification_title VARCHAR(255);
  notification_message TEXT;
  internship_title TEXT;
  software_house_id UUID;
  student_name TEXT;
BEGIN
  -- Get internship details
  SELECT i.title, i.software_house_id INTO internship_title, software_house_id
  FROM internships i
  WHERE i.id = NEW.internship_id;

  -- Get student name
  SELECT COALESCE(p.full_name, p.email, 'A student') INTO student_name
  FROM profiles p
  WHERE p.id = NEW.user_id;

  -- Create notification for software house (only if it doesn't already exist)
  -- Check if notification already exists to prevent duplicates
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = software_house_id 
      AND type = 'new_application' 
      AND related_id = NEW.id 
      AND related_type = 'application'
  ) THEN
    notification_title := 'New Application Received';
    notification_message := student_name || ' has applied for your internship "' || 
      COALESCE(internship_title, 'Untitled') || '".';
    
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read)
    VALUES (
      software_house_id,
      'new_application',
      notification_title,
      notification_message,
      NEW.id,
      'application',
      jsonb_build_object('internship_title', internship_title, 'student_name', student_name, 'application_id', NEW.id, 'internship_id', NEW.internship_id),
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS trigger_notify_new_application ON applications;
CREATE TRIGGER trigger_notify_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_application();

-- Trigger function to notify admin when new pending account is created
CREATE OR REPLACE FUNCTION notify_admin_new_pending_account()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
  notification_title VARCHAR(255);
  notification_message TEXT;
BEGIN
  -- Only trigger for guest and software_house roles with pending status
  IF NEW.role NOT IN ('guest', 'software_house') OR NEW.approval_status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Create notification for all admins
  FOR admin_id IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    notification_title := 'New Account Pending Approval';
    notification_message := CASE 
      WHEN NEW.role = 'software_house' THEN 
        COALESCE(NEW.organization_name, NEW.full_name, NEW.email) || ' (Software House) account is pending approval.'
      WHEN NEW.role = 'guest' THEN
        COALESCE(NEW.full_name, NEW.email) || ' (Guest) account is pending approval.'
      ELSE
        COALESCE(NEW.full_name, NEW.email) || ' account is pending approval.'
    END;
    
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata)
    VALUES (
      admin_id,
      'user_approval',
      notification_title,
      notification_message,
      NEW.id,
      'profile',
      jsonb_build_object('status', 'pending', 'role', NEW.role, 'organization_name', NEW.organization_name, 'full_name', NEW.full_name, 'email', NEW.email)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new pending accounts
DROP TRIGGER IF EXISTS trigger_notify_admin_new_account ON profiles;
CREATE TRIGGER trigger_notify_admin_new_account
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role IN ('guest', 'software_house') AND NEW.approval_status = 'pending')
  EXECUTE FUNCTION notify_admin_new_pending_account();

-- Trigger function to notify admin when new pending internship is created
CREATE OR REPLACE FUNCTION notify_admin_new_pending_internship()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
  notification_title VARCHAR(255);
  notification_message TEXT;
  software_house_name TEXT;
BEGIN
  -- Only trigger for pending internships
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get software house name
  SELECT COALESCE(p.organization_name, p.full_name, p.email, 'A software house') INTO software_house_name
  FROM profiles p
  WHERE p.id = NEW.software_house_id;

  -- Create notification for all admins (only if it doesn't already exist)
  FOR admin_id IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    -- Check if notification already exists to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = admin_id 
        AND type = 'internship_approval' 
        AND related_id = NEW.id 
        AND related_type = 'internship'
        AND metadata->>'status' = 'pending'
    ) THEN
      notification_title := 'Internship Approval';
      notification_message := software_house_name || ' comes for approval for their internship "' || 
        COALESCE(NEW.title, 'Untitled') || '".';
      
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, metadata, is_read)
      VALUES (
        admin_id,
        'internship_approval',
        notification_title,
        notification_message,
        NEW.id,
        'internship',
        jsonb_build_object('status', 'pending', 'internship_title', NEW.title, 'software_house_id', NEW.software_house_id, 'software_house_name', software_house_name),
        FALSE
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new pending internships
DROP TRIGGER IF EXISTS trigger_notify_admin_new_internship ON internships;
CREATE TRIGGER trigger_notify_admin_new_internship
  AFTER INSERT ON internships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admin_new_pending_internship();

