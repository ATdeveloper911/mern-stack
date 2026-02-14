-- ============================================
-- Add Missing Columns to cv_forms Table
-- ============================================
-- This script adds the missing columns that are used in the CV form
-- Based on frontend/src/pages/CVForm.jsx requirements

-- Add projects column (JSONB for array of project objects)
ALTER TABLE public.cv_forms 
ADD COLUMN IF NOT EXISTS projects JSONB;

-- Add certifications column (JSONB for array of certification objects)
-- This is the column causing the error: "Could not find the 'certifications' column"
ALTER TABLE public.cv_forms 
ADD COLUMN IF NOT EXISTS certifications JSONB;

-- Add languages column (JSONB for array of language objects)
ALTER TABLE public.cv_forms 
ADD COLUMN IF NOT EXISTS languages JSONB;

-- Add is_complete column (BOOLEAN to track if CV is complete)
ALTER TABLE public.cv_forms 
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Add created_at column if it doesn't exist (for tracking creation time)
ALTER TABLE public.cv_forms 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Force schema cache refresh by running a query
-- This helps Supabase update its schema cache immediately
SELECT COUNT(*) FROM public.cv_forms;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'cv_forms'
ORDER BY ordinal_position;

