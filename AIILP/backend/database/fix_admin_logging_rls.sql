-- ============================================
-- Fix Admin Logging RLS Issues
-- ============================================
-- This script ensures admin_logs can be inserted properly

-- First, ensure the function exists and has proper permissions
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action TO anon;

-- Ensure RLS allows the function to work
-- The function uses SECURITY DEFINER so it runs as the function owner (postgres)
-- which bypasses RLS. But we still need the policy for direct inserts.

-- Update RLS policy to be more permissive for authenticated admins
DROP POLICY IF EXISTS "Admins can insert logs" ON admin_logs;

CREATE POLICY "Admins can insert logs" 
ON admin_logs FOR INSERT 
WITH CHECK ( 
  EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Also allow the function to insert (it uses SECURITY DEFINER, but this helps)
-- Actually, SECURITY DEFINER functions bypass RLS entirely, so this is just for direct inserts

-- Test the function (commented out - uncomment to test)
-- SELECT public.log_admin_action(
--   'your-admin-id-here'::UUID,
--   'test_action',
--   'system',
--   NULL,
--   'Test log entry',
--   '{"test": true}'::jsonb
-- );

