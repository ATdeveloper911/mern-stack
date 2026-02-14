-- ============================================
-- Fix applications.status enum type
-- ============================================
-- The applications table is using item_status enum instead of application_status
-- This script fixes the column to use the correct enum type

-- Step 1: Check current enum type
DO $$
DECLARE
    current_type TEXT;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'status';
    
    RAISE NOTICE 'Current status column type: %', current_type;
END $$;

-- Step 2: Create application_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
        RAISE NOTICE 'Created application_status enum';
    ELSE
        RAISE NOTICE 'application_status enum already exists';
    END IF;
END $$;

-- Step 3: Check if item_status enum exists and what values it has
DO $$
DECLARE
    enum_values TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_status') THEN
        SELECT string_agg(enumlabel::text, ', ' ORDER BY enumsortorder) INTO enum_values
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_status');
        
        RAISE NOTICE 'item_status enum values: %', enum_values;
    ELSE
        RAISE NOTICE 'item_status enum does not exist';
    END IF;
END $$;

-- Step 4: Drop triggers that depend on the status column
-- We need to drop triggers before altering the column type
DROP TRIGGER IF EXISTS log_application_update ON public.applications;
DROP TRIGGER IF EXISTS log_application_insert ON public.applications;
DROP TRIGGER IF EXISTS update_applications_ts ON public.applications;

-- Step 5: If applications.status is using item_status, change it to application_status
-- First, we need to convert any existing data
DO $$
DECLARE
    current_default TEXT;
BEGIN
    -- Get the current default value
    SELECT column_default INTO current_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'status';
    
    RAISE NOTICE 'Current default value: %', current_default;
    
    -- Check if the column is using item_status or needs conversion
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns c
        JOIN pg_type t ON t.typname = c.udt_name
        WHERE c.table_schema = 'public'
          AND c.table_name = 'applications'
          AND c.column_name = 'status'
          AND t.typname IN ('item_status', 'text')
    ) OR NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns c
        JOIN pg_type t ON t.typname = c.udt_name
        WHERE c.table_schema = 'public'
          AND c.table_name = 'applications'
          AND c.column_name = 'status'
          AND t.typname = 'application_status'
    ) THEN
        RAISE NOTICE 'Converting applications.status to application_status enum...';
        
        -- Drop the default value first
        ALTER TABLE public.applications 
        ALTER COLUMN status DROP DEFAULT;
        
        -- Convert the column to text first
        ALTER TABLE public.applications 
        ALTER COLUMN status TYPE TEXT USING status::TEXT;
        
        -- Now convert to application_status enum
        ALTER TABLE public.applications 
        ALTER COLUMN status TYPE application_status USING 
            CASE status
                WHEN 'pending' THEN 'pending'::application_status
                WHEN 'accepted' THEN 'accepted'::application_status
                WHEN 'rejected' THEN 'rejected'::application_status
                ELSE 'pending'::application_status
            END;
        
        -- Restore the default value
        ALTER TABLE public.applications 
        ALTER COLUMN status SET DEFAULT 'pending'::application_status;
        
        RAISE NOTICE 'Successfully converted applications.status to application_status enum';
    ELSE
        RAISE NOTICE 'applications.status is already using application_status enum';
    END IF;
END $$;

-- Step 6: Recreate the triggers
-- Recreate update_applications_ts trigger (for updated_at) - if function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp') THEN
        CREATE TRIGGER update_applications_ts 
        BEFORE UPDATE ON public.applications 
        FOR EACH ROW 
        EXECUTE FUNCTION update_timestamp();
        RAISE NOTICE 'Recreated update_applications_ts trigger';
    ELSE
        RAISE NOTICE 'update_timestamp function not found, skipping trigger recreation';
    END IF;
END $$;

-- Recreate log_application_insert trigger (if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_log_application_insert') THEN
        CREATE TRIGGER log_application_insert
        AFTER INSERT ON public.applications
        FOR EACH ROW 
        EXECUTE FUNCTION public.trg_log_application_insert();
        RAISE NOTICE 'Recreated log_application_insert trigger';
    END IF;
END $$;

-- Recreate log_application_update trigger (if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_log_application_update') THEN
        CREATE TRIGGER log_application_update
        AFTER UPDATE OF status ON public.applications
        FOR EACH ROW 
        EXECUTE FUNCTION public.trg_log_application_update();
        RAISE NOTICE 'Recreated log_application_update trigger';
    END IF;
END $$;

-- Step 7: Verify the fix
SELECT 
    column_name,
    data_type,
    udt_name as enum_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'applications'
  AND column_name = 'status';

-- Step 8: Show current enum values
SELECT 
    t.typname as enum_name,
    string_agg(e.enumlabel::text, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('application_status', 'item_status')
GROUP BY t.typname;

-- Step 9: Force schema cache refresh
SELECT COUNT(*) FROM public.applications;

