-- ============================================
-- Complete RLS Policy Fix for All Portals
-- This fixes the issue where students/guests cannot view internships
-- because profiles RLS blocks joins from other tables
-- ============================================
--
-- PROBLEM: When students/guests query internships with:
--   .select('*, profiles:software_house_id (organization_name, full_name)')
-- Supabase applies RLS to the profiles table, blocking the join.
--
-- SOLUTION: Update profiles RLS to allow reading profiles when they're
-- referenced as foreign keys in other tables (internships, students, etc.)
-- ============================================

-- Step 1: Fix Profiles RLS to allow reading profile data when joined from other tables
-- ============================================
-- This is the KEY FIX: Allow reading profiles when they're referenced as foreign keys
-- in other tables (e.g., internships.software_house_id, students.university_id)

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow reading software house profiles from approved internships" ON public.profiles;
DROP POLICY IF EXISTS "Allow reading university profiles from students" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Allow reading software house profiles (they're public-facing entities)
-- This enables the join: profiles:software_house_id in internships queries
-- Software houses are meant to be visible to students/guests when viewing internships
CREATE POLICY "Allow reading software house profiles" 
ON public.profiles FOR SELECT 
USING (role = 'software_house');

-- Policy 3: Allow reading university profiles (they're public-facing entities)
-- This enables viewing university info when viewing students
CREATE POLICY "Allow reading university profiles" 
ON public.profiles FOR SELECT 
USING (role = 'university');

-- Policy 4: Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p_admin
    WHERE p_admin.id = auth.uid()
    AND p_admin.role = 'admin'
  )
);

-- Step 2: Verify and ensure internship status enum is correct
-- ============================================
-- Check if status column uses correct enum, fix if needed
DO $$
DECLARE
  current_type TEXT;
BEGIN
  -- Get current type of status column
  SELECT udt_name INTO current_type
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'internships' 
    AND column_name = 'status';
  
  -- Check if it's using wrong enum type
  IF current_type = 'item_status' THEN
    RAISE NOTICE 'Warning: internships.status is using item_status instead of internship_status';
    RAISE NOTICE 'You may need to alter the column type manually if data exists';
    -- Note: We don't auto-fix this as it requires data migration
  ELSIF current_type != 'internship_status' AND current_type IS NOT NULL THEN
    RAISE NOTICE 'Warning: internships.status type is: % (expected: internship_status)', current_type;
  END IF;
END $$;

-- Step 3: Update Internships RLS to ensure approved internships are viewable by all
-- ============================================
-- Drop existing policy
DROP POLICY IF EXISTS "Public can view approved internships" ON public.internships;
DROP POLICY IF EXISTS "Anyone can view approved internships" ON public.internships;

-- Create policy that allows anyone (authenticated or anonymous) to view approved internships
CREATE POLICY "Anyone can view approved internships" 
ON public.internships FOR SELECT 
USING (status = 'approved');

-- Allow software houses to view their own internships (regardless of status)
CREATE POLICY "Software houses can view own internships" 
ON public.internships FOR SELECT 
USING (auth.uid() = software_house_id);

-- Allow admins to view all internships
CREATE POLICY "Admins can view all internships" 
ON public.internships FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Step 4: Update Applications RLS
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Software houses can view applications for their internships" ON public.applications;
DROP POLICY IF EXISTS "Universities can view their students' applications" ON public.applications;

-- Applicants can view their own applications
CREATE POLICY "Applicants can view own applications" 
ON public.applications FOR SELECT 
USING (auth.uid() = user_id);

-- Software houses can view applications for their internships (with applicant profiles)
CREATE POLICY "Software houses can view applications for their internships" 
ON public.applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.internships 
    WHERE internships.id = applications.internship_id 
    AND internships.software_house_id = auth.uid()
  )
);

-- Universities can view applications of their students
CREATE POLICY "Universities can view their students' applications" 
ON public.applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.students 
    WHERE students.user_id = applications.user_id
    AND students.university_id = auth.uid()
  )
);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" 
ON public.applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Step 5: Verify Foreign Key Relationships
-- ============================================
-- List all foreign keys for verification (they should be created by schema.sql)

-- Verify internships.software_house_id foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND table_name = 'internships'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%software_house_id%'
  ) THEN
    ALTER TABLE public.internships
    ADD CONSTRAINT internships_software_house_id_fkey
    FOREIGN KEY (software_house_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Created foreign key: internships.software_house_id -> profiles.id';
  END IF;
END $$;

-- Verify applications.internship_id foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND table_name = 'applications'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%internship_id%'
  ) THEN
    ALTER TABLE public.applications
    ADD CONSTRAINT applications_internship_id_fkey
    FOREIGN KEY (internship_id) 
    REFERENCES public.internships(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Created foreign key: applications.internship_id -> internships.id';
  END IF;
END $$;

-- Verify students.university_id foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
    AND table_name = 'students'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%university_id%'
  ) THEN
    ALTER TABLE public.students
    ADD CONSTRAINT students_university_id_fkey
    FOREIGN KEY (university_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Created foreign key: students.university_id -> profiles.id';
  END IF;
END $$;

-- Step 7: Verify all policies were created
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using
FROM pg_policies 
WHERE tablename IN ('profiles', 'internships', 'applications', 'students')
ORDER BY tablename, policyname;

-- Step 8: Summary
-- ============================================
SELECT 
  'RLS Policies Fixed' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename IN ('profiles', 'internships', 'applications', 'students');

