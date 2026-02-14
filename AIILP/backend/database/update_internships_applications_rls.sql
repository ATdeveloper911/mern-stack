-- ============================================
-- Update RLS Policies for Internships and Applications
-- Allow guests and students to view internships
-- Allow software houses to view applications for their internships
-- ============================================

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Public can view approved internships" ON public.internships;
DROP POLICY IF EXISTS "Software houses can view applications for their internships" ON public.applications;

-- Internships RLS: Allow authenticated users (students, guests) and anonymous users to view approved internships
-- This replaces the "Public" policy to ensure it works for both authenticated and anonymous users
CREATE POLICY "Anyone can view approved internships" 
ON public.internships FOR SELECT 
USING (status = 'approved');

-- Applications RLS: Allow software houses to view applications for their internships
-- This is needed so software houses can see who applied to their internships
CREATE POLICY "Software houses can view applications for their internships" 
ON public.applications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.internships 
    WHERE internships.id = applications.internship_id 
    AND internships.software_house_id = auth.uid()
  )
);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('internships', 'applications')
ORDER BY tablename, policyname;

