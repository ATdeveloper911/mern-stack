-- ============================================
-- Platform Activity Logging Setup
-- ============================================

-- Table stores actions performed by any portal user (students, universities,
-- software houses, guests, admins). Admins can view all; users can insert
-- their own actions. Some entries are inserted automatically via triggers.

-- 1) Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_role ON public.activity_logs(role);

-- 2) RLS Policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity
CREATE POLICY "Admins can view activity" 
ON public.activity_logs FOR SELECT
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" 
ON public.activity_logs FOR INSERT
WITH CHECK (actor_id = auth.uid());

-- 3) Function: log_user_activity - SECURITY DEFINER for trigger-based inserts
-- Allows triggers to insert logs even if RLS would block direct insert
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_actor_id UUID,
  p_role TEXT,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- ensure actor exists in profiles
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_actor_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.activity_logs (
    actor_id, role, action, target_type, target_id, metadata, timestamp
  ) VALUES (
    p_actor_id, p_role, p_action, p_target_type, p_target_id, p_metadata, NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to log user activity: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4) Triggers: capture core platform activities

-- Applications: when a student applies to an internship
CREATE OR REPLACE FUNCTION public.trg_log_application_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.user_id;
  PERFORM public.log_user_activity(
    NEW.user_id,
    COALESCE(v_role, 'student'),
    'create_application',
    'application',
    NEW.id,
    jsonb_build_object('internship_id', NEW.internship_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_application_insert ON public.applications;
CREATE TRIGGER log_application_insert
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.trg_log_application_insert();

-- Applications: when status changes
CREATE OR REPLACE FUNCTION public.trg_log_application_update()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_role TEXT;
BEGIN
  -- Actor can be applicant or software house (owner of internship) depending on who updates
  -- We default to the current auth user if available, else applicant
  v_actor := COALESCE(auth.uid(), NEW.user_id);
  SELECT role INTO v_role FROM public.profiles WHERE id = v_actor;
  PERFORM public.log_user_activity(
    v_actor,
    COALESCE(v_role, 'student'),
    'update_application_status',
    'application',
    NEW.id,
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_application_update ON public.applications;
CREATE TRIGGER log_application_update
AFTER UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.trg_log_application_update();

-- Internships: when a software house creates an internship
CREATE OR REPLACE FUNCTION public.trg_log_internship_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.software_house_id;
  PERFORM public.log_user_activity(
    NEW.software_house_id,
    COALESCE(v_role, 'software_house'),
    'create_internship',
    'internship',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_internship_insert ON public.internships;
CREATE TRIGGER log_internship_insert
AFTER INSERT ON public.internships
FOR EACH ROW EXECUTE FUNCTION public.trg_log_internship_insert();

-- Internships: when status changes
CREATE OR REPLACE FUNCTION public.trg_log_internship_update()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_role TEXT;
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.software_house_id);
  SELECT role INTO v_role FROM public.profiles WHERE id = v_actor;
  PERFORM public.log_user_activity(
    v_actor,
    COALESCE(v_role, 'software_house'),
    'update_internship_status',
    'internship',
    NEW.id,
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_internship_update ON public.internships;
CREATE TRIGGER log_internship_update
AFTER UPDATE OF status ON public.internships
FOR EACH ROW EXECUTE FUNCTION public.trg_log_internship_update();

-- Profiles: when a user updates their profile picture
CREATE OR REPLACE FUNCTION public.trg_log_profile_picture_update()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.id;
  IF NEW.profile_picture IS DISTINCT FROM OLD.profile_picture THEN
    PERFORM public.log_user_activity(
      NEW.id,
      COALESCE(v_role, 'guest'),
      'update_profile_picture',
      'profile',
      NEW.id,
      jsonb_build_object('old_path', OLD.profile_picture, 'new_path', NEW.profile_picture)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_profile_picture_update ON public.profiles;
CREATE TRIGGER log_profile_picture_update
AFTER UPDATE OF profile_picture ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_log_profile_picture_update();

-- ============================================
-- End of Activity Logging Setup
-- ============================================