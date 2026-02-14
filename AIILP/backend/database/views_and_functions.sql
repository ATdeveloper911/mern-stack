-- ============================================
-- Functions, Views, and Triggers
-- ============================================

-- Extensions required
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Utility: get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$ LANGUAGE sql STABLE;

-- Trigger to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CV completeness helper
CREATE OR REPLACE FUNCTION public.is_cv_complete(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_complete, FALSE) FROM public.cv_forms WHERE user_id = user_uuid;
$$ LANGUAGE sql STABLE;

-- Pending counts for admin dashboard
CREATE OR REPLACE FUNCTION public.get_pending_counts()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'internships', (SELECT COUNT(*) FROM public.internships WHERE status = 'pending'),
    'software_houses', (SELECT COUNT(*) FROM public.profiles WHERE role = 'software_house' AND approval_status = 'pending'),
    'guests', (SELECT COUNT(*) FROM public.profiles WHERE role = 'guest' AND approval_status = 'pending')
  );
$$ LANGUAGE sql STABLE;

-- View: application_tracking (detailed rows)
CREATE OR REPLACE VIEW public.application_tracking AS
SELECT a.id AS application_id,
       a.user_id,
       a.internship_id,
       a.status,
       a.feedback,
       a.applied_at,
       a.updated_at,
       i.title AS internship_title,
       i.software_house_id,
       p.role AS user_role,
       p.university_id
FROM public.applications a
JOIN public.internships i ON i.id = a.internship_id
JOIN public.profiles p ON p.id = a.user_id;

-- View: university_student_applications (for university tracking)
CREATE OR REPLACE VIEW public.university_student_applications AS
SELECT a.id AS application_id,
       a.user_id,
       p.university_id,
       a.internship_id,
       a.status,
       a.applied_at
FROM public.applications a
JOIN public.profiles p ON p.id = a.user_id
WHERE p.role = 'student' AND p.university_id IS NOT NULL;

-- Triggers: auto-update updated_at using provided function
CREATE TRIGGER update_profiles_ts BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER update_cv_forms_ts BEFORE UPDATE ON cv_forms FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER update_applications_ts BEFORE UPDATE ON applications FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Trigger for admin logging on internship updates (e.g., approval)
CREATE OR REPLACE FUNCTION log_internship_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO admin_logs (admin_id, action, target_id, feedback)
        VALUES (auth.uid(), CONCAT('update_internship_status_to_', NEW.status), NEW.id, NEW.feedback);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_internship_changes AFTER UPDATE ON internships FOR EACH ROW EXECUTE PROCEDURE log_internship_update();