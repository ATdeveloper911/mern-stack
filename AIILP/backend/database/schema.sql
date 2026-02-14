-- ============================================
-- AIILP Database Schema (Aligned to Services)
-- ============================================

-- Enums
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('student', 'university', 'software_house', 'guest', 'admin');
CREATE TYPE IF NOT EXISTS internship_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE IF NOT EXISTS application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE IF NOT EXISTS approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  university_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  profile_picture TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL,
  batch INTEGER,
  degree_program TEXT,
  semester INTEGER,
  credentials JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CV Forms
CREATE TABLE IF NOT EXISTS public.cv_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal JSONB NOT NULL,
  education JSONB NOT NULL,
  skills TEXT[] NOT NULL,
  experience JSONB,
  projects JSONB,
  certifications JSONB,
  languages JSONB,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Internships
CREATE TABLE IF NOT EXISTS public.internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_house_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL,
  duration TEXT NOT NULL,
  location TEXT,
  stipend NUMERIC,
  requirements TEXT,
  status internship_status NOT NULL DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

-- Applications
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'pending',
  cv_data JSONB NOT NULL,
  feedback TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, internship_id)
);

-- Admin Logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  feedback TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bulk Uploads
CREATE TABLE IF NOT EXISTS public.bulk_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing','completed','failed')),
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
-- Profiles indexes 
CREATE INDEX idx_profiles_role ON profiles(role); 
CREATE INDEX idx_profiles_university_id ON profiles(university_id); 

-- Students indexes 
CREATE INDEX idx_students_university_id ON students(university_id); 
CREATE INDEX idx_students_email ON students(email); 

-- Internships indexes 
CREATE INDEX idx_internships_software_house_id ON internships(software_house_id); 
CREATE INDEX idx_internships_status ON internships(status); 
CREATE INDEX idx_internships_created_at ON internships(created_at); 

-- CV Forms indexes 
CREATE INDEX idx_cv_forms_user_id ON cv_forms(user_id); 

-- Applications indexes 
CREATE INDEX idx_applications_user_id ON applications(user_id); 
CREATE INDEX idx_applications_internship_id ON applications(internship_id); 
CREATE INDEX idx_applications_status ON applications(status); 
CREATE INDEX idx_applications_updated_at ON applications(updated_at); 

-- Admin Logs indexes 
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id); 
CREATE INDEX idx_admin_logs_timestamp ON admin_logs(timestamp);