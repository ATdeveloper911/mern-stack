-- ============================================
-- Add Missing Columns to admin_logs Table
-- ============================================
-- This adds target_type and metadata columns to match the schema
-- Run this FIRST, then you can use the full insert script

-- Add target_type column if it doesn't exist
ALTER TABLE admin_logs 
ADD COLUMN IF NOT EXISTS target_type TEXT;

-- Add metadata column if it doesn't exist  
ALTER TABLE admin_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comments
COMMENT ON COLUMN admin_logs.target_type IS 'Type of target (profile, internship, system, etc.)';
COMMENT ON COLUMN admin_logs.metadata IS 'Additional metadata in JSON format';

-- Update existing rows to have default target_type based on action
UPDATE admin_logs 
SET target_type = CASE
  WHEN action LIKE '%account%' OR action LIKE '%profile%' THEN 'profile'
  WHEN action LIKE '%internship%' THEN 'internship'
  WHEN action LIKE '%login%' OR action LIKE '%logout%' THEN 'system'
  ELSE 'unknown'
END
WHERE target_type IS NULL;
