-- ============================================
-- Verify and Fix Internships Table Columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Verify current columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'internships'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE public.internships 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS type TEXT;

-- Step 3: Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'internships'
  AND column_name IN ('location', 'type');

-- Step 4: Force refresh the schema cache by running a simple query
-- This helps Supabase refresh its internal cache
SELECT COUNT(*) FROM public.internships;

-- Step 5: Grant necessary permissions (if needed)
-- The RLS policies should already handle access, but ensure columns are accessible
GRANT SELECT, INSERT, UPDATE ON public.internships TO authenticated;
GRANT SELECT ON public.internships TO anon;


