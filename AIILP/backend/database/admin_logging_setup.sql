-- ============================================
-- Comprehensive Admin Logging Setup
-- ============================================

-- Function to safely log admin actions (handles RLS and errors)
-- This function uses SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_feedback TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  -- Only log if user is admin
  IF v_is_admin THEN
    -- Use SECURITY DEFINER to bypass RLS - insert directly
    INSERT INTO public.admin_logs (
      admin_id,
      action,
      target_type,
      target_id,
      feedback,
      metadata,
      timestamp
    )
    VALUES (
      p_admin_id,
      p_action,
      p_target_type,
      p_target_id,
      p_feedback,
      p_metadata,
      NOW()
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
  ELSE
    -- Return NULL if not admin (fail silently for non-admins)
    RETURN NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to log admin action: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Log profile approval status changes
CREATE OR REPLACE FUNCTION public.log_profile_approval_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when approval_status changes
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    -- Only log if changed by an admin (check via auth.uid())
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
      PERFORM public.log_admin_action(
        auth.uid(),
        CASE 
          WHEN NEW.approval_status = 'approved' THEN 'approve_account'
          WHEN NEW.approval_status = 'rejected' THEN 'reject_account'
          WHEN NEW.approval_status = 'pending' THEN 'reset_account_approval'
          ELSE 'update_account_status'
        END,
        'profile',
        NEW.id,
        NULL,
        jsonb_build_object(
          'old_status', OLD.approval_status,
          'new_status', NEW.approval_status,
          'old_active', OLD.is_active,
          'new_active', NEW.is_active
        )
      );
    END IF;
  END IF;

  -- Log when is_active changes
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
      PERFORM public.log_admin_action(
        auth.uid(),
        CASE 
          WHEN NEW.is_active = TRUE THEN 'activate_account'
          WHEN NEW.is_active = FALSE THEN 'deactivate_account'
          ELSE 'update_account_active'
        END,
        'profile',
        NEW.id,
        NULL,
        jsonb_build_object(
          'old_active', OLD.is_active,
          'new_active', NEW.is_active
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile changes
DROP TRIGGER IF EXISTS log_profile_approval_changes_trigger ON public.profiles;
CREATE TRIGGER log_profile_approval_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.approval_status IS DISTINCT FROM NEW.approval_status OR
    OLD.is_active IS DISTINCT FROM NEW.is_active
  )
  EXECUTE FUNCTION public.log_profile_approval_changes();

-- Trigger: Log internship status changes (improved version)
CREATE OR REPLACE FUNCTION public.log_internship_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
      PERFORM public.log_admin_action(
        auth.uid(),
        CASE 
          WHEN NEW.status = 'approved' THEN 'approve_internship'
          WHEN NEW.status = 'rejected' THEN 'reject_internship'
          WHEN NEW.status = 'pending' THEN 'reset_internship_status'
          ELSE 'update_internship_status'
        END,
        'internship',
        NEW.id,
        NEW.feedback,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'title', NEW.title
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace existing trigger
DROP TRIGGER IF EXISTS log_internship_changes ON public.internships;
CREATE TRIGGER log_internship_changes
  AFTER UPDATE ON public.internships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_internship_status_changes();

-- Grant execute permission on the logging function
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.log_admin_action IS 'Safely logs admin actions with RLS handling and error recovery';

