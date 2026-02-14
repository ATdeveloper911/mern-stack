-- ============================================
-- Add feedback column to applications table
-- ============================================

-- Add feedback column if it doesn't exist
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.applications.feedback IS 'Feedback from software house on the application status';

-- Force schema cache refresh by running a query
SELECT COUNT(*) FROM public.applications;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'applications'
  AND column_name = 'feedback';

