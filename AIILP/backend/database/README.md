# Database Setup

This directory contains versioned SQL files to provision the AIILP backend schema in a fresh Supabase project.

## Files
- `schema.sql`: Tables, enums, and indexes aligned with implemented services.
- `views_and_functions.sql`: Helper functions, views, and updated_at triggers.
- `rls_policies.sql`: Row Level Security policies based on user roles.
- `storage_setup.sql`: RLS for the `csv-uploads` storage bucket.

## Order of Execution
Run these files in order:
1. `schema.sql`
2. `views_and_functions.sql`
3. `rls_policies.sql`
4. `storage_setup.sql`

## Notes
- Ensure `pgcrypto` extension is enabled (the functions file will create it if missing).
- Buckets are typically created via the Supabase Storage API. The provided policies assume a bucket named `csv-uploads` exists.
- The schema uses `gen_random_uuid()` for IDs. If you prefer `uuid_generate_v4()`, enable `uuid-ossp` extension and adjust defaults.
- Application statuses are distinct from internship statuses to match service logic (`accepted` for applications).

## Applying
You can apply manually in the SQL editor or via CLI:

```bash
supabase db push
```

Or run each file in order using the SQL editor.