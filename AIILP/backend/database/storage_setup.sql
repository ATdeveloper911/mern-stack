-- ============================================
-- Storage bucket for CSV uploads
-- ============================================

-- Create bucket (run via storage API or SQL if permitted)
-- Note: In Supabase, buckets are managed via the Storage API; this DDL is illustrative.

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies for csv-uploads bucket
CREATE POLICY storage_csv_public_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'csv-uploads' AND (
      -- Owner can always read
      (owner = auth.uid()) OR
      -- University can read their own uploads by path prefix
      (public.get_user_role(auth.uid()) = 'university' AND (storage.foldername(name))[1]::text = auth.uid()::text)
    )
  );

CREATE POLICY storage_csv_university_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'csv-uploads' AND public.get_user_role(auth.uid()) = 'university'
  );

CREATE POLICY storage_csv_university_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'csv-uploads' AND public.get_user_role(auth.uid()) = 'university' AND owner = auth.uid()
  );

CREATE POLICY storage_csv_university_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'csv-uploads' AND public.get_user_role(auth.uid()) = 'university' AND owner = auth.uid()
  );

-- Helper: ensure foldername function exists (Supabase provides helper; define fallback)
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] AS $$
  SELECT string_to_array(name, '/');
$$ LANGUAGE sql IMMUTABLE;