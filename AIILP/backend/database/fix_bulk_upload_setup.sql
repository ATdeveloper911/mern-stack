-- ============================================
-- Fix Bulk Upload Setup (Storage + Students Table)
-- Run this entire script in Supabase SQL Editor
-- Safe: only creates bucket/policies/columns/indexes if missing
-- ============================================

-- Create bucket via direct insert (works when RPC unavailable)
-- ============================================
-- CSV Bulk Upload: Owner-safe Bucket Ensure (no storage.objects changes)
-- Run this script in Supabase SQL editor.
-- If policy creation fails with ownership errors,
-- create equivalent policies via Storage UI.
-- ============================================

-- 1) Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
SELECT 'csv-uploads', 'csv-uploads', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'csv-uploads'
);

-- NOTE: We intentionally do NOT alter storage.objects or create policies here
-- to avoid the 42501 owner error. The application now bypasses Storage for
-- CSV processing by sending CSV text directly to the edge function.

-- Optional: verify bucket
-- SELECT id, name, public FROM storage.buckets WHERE id = 'csv-uploads';

-- NOTE: Supabase Storage policies require owner privileges to change via SQL.
-- To manage Storage policies, use the Supabase Dashboard Storage UI.

-- 3) Patch students table with required columns
alter table public.students add column if not exists user_id uuid;
alter table public.students add column if not exists student_id text;
alter table public.students add column if not exists batch integer;
alter table public.students add column if not exists degree_program text;
alter table public.students add column if not exists semester integer;
alter table public.students add column if not exists updated_at timestamptz not null default now();

-- 4) Constraints and indexes (idempotent)
-- Email unique
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'students_email_key') then
    alter table public.students add constraint students_email_key unique (email);
  end if;
end $$;

-- Foreign key to auth.users on user_id (nullable-safe)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'students_user_id_fkey') then
    alter table public.students
      add constraint students_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- Partial unique index on user_id when present
do $$ begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'idx_students_user_id_unique' and n.nspname = 'public'
  ) then
    create unique index idx_students_user_id_unique on public.students(user_id) where user_id is not null;
  end if;
end $$;

-- Indexes for common lookups
do $$ begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'idx_students_university_id' and n.nspname = 'public'
  ) then
    create index idx_students_university_id on public.students(university_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'idx_students_email' and n.nspname = 'public'
  ) then
    create index idx_students_email on public.students(email);
  end if;
end $$;

-- 5) Optional: set default on students.id if not present
do $$ begin
  if not exists (
    select 1 from pg_attrdef d
    join pg_class c on c.oid = d.adrelid
    join pg_attribute a on a.attrelid = c.oid and a.attnum = d.adnum
    where c.relname = 'students' and a.attname = 'id'
  ) then
    alter table public.students alter column id set default gen_random_uuid();
  end if;
end $$;

-- 6) Ensure bulk_uploads table exists (idempotent)
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

-- Index to speed up queries by university
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_bulk_uploads_university_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_bulk_uploads_university_id ON public.bulk_uploads(university_id);
  END IF;
END $$;

-- 7) RLS for bulk_uploads: universities can manage their own records
ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present
DROP POLICY IF EXISTS bulk_university_insert ON public.bulk_uploads;
DROP POLICY IF EXISTS bulk_university_select ON public.bulk_uploads;
DROP POLICY IF EXISTS bulk_university_update ON public.bulk_uploads;

-- Insert policy: only allow inserts for the current university user
CREATE POLICY bulk_university_insert ON public.bulk_uploads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = university_id);

-- Select policy: university can see their own uploads
CREATE POLICY bulk_university_select ON public.bulk_uploads
  FOR SELECT TO authenticated
  USING (auth.uid() = university_id);

-- Update policy: university can update their own uploads (optional)
CREATE POLICY bulk_university_update ON public.bulk_uploads
  FOR UPDATE TO authenticated
  USING (auth.uid() = university_id)
  WITH CHECK (auth.uid() = university_id);

-- ============================================
-- End of script
-- ============================================