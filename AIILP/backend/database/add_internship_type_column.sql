-- Add missing columns to internships table
-- This script adds the 'type' column that is required by the PostInternship form

-- Add 'type' column to internships table
-- This column stores the internship type: full-time, part-time, remote, hybrid
ALTER TABLE public.internships 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.internships.type IS 'Internship type: full-time, part-time, remote, or hybrid';

-- Verify the column was added (optional - for manual verification)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'internships' 
--   AND column_name IN ('location', 'type');


