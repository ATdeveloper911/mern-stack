# RLS Policy Fix Instructions

## Problem
Students and guests cannot view internships because the Profiles RLS policy blocks joins when querying internships with software house information.

## Solution
The SQL file `fix_complete_rls_policies.sql` has been updated with simplified RLS policies that:

1. **Allow reading software house profiles** - Since software houses are public-facing entities, their profiles can be read by anyone
2. **Allow reading university profiles** - Universities are also public-facing entities
3. **Maintain security** - Students, guests, and other roles can still only view their own profiles directly

## Steps to Apply the Fix

### 1. Run the SQL File in Supabase

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `backend/database/fix_complete_rls_policies.sql`
4. Click **Run** to execute the SQL

### 2. Verify the Policies Were Created

After running the SQL, you should see:
- 4 policies on `profiles` table:
  - "Users can view own profile"
  - "Allow reading software house profiles"
  - "Allow reading university profiles"
  - "Admins can view all profiles"
- 3 policies on `internships` table:
  - "Anyone can view approved internships"
  - "Software houses can view own internships"
  - "Admins can view all internships"
- 4 policies on `applications` table:
  - "Applicants can view own applications"
  - "Software houses can view applications for their internships"
  - "Universities can view their students' applications"
  - "Admins can view all applications"

### 3. Test the Fix

1. Log in as a student or guest
2. Navigate to the Dashboard or Listings page
3. You should now see approved internships with software house information

### 4. Check Browser Console

If internships still don't load:
1. Open browser DevTools (F12)
2. Check the Console tab for any errors
3. Check the Network tab to see if the API call is successful
4. Look for error messages like "permission denied" or "RLS policy violation"

## Frontend Changes Made

The following frontend files have been updated with better error handling:

1. **`frontend/src/pages/student/Dashboard.jsx`**
   - Added error logging and display
   - Added retry functionality
   - Improved error messages

2. **`frontend/src/pages/Listings.jsx`**
   - Added error logging and display
   - Added retry functionality
   - Improved error messages

## Troubleshooting

### If internships still don't load:

1. **Check RLS is enabled**: In Supabase Dashboard → Authentication → Policies, verify RLS is enabled for all tables
2. **Check policies exist**: Run this query in SQL Editor:
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE tablename IN ('profiles', 'internships', 'applications')
   ORDER BY tablename, policyname;
   ```
3. **Check for approved internships**: Run this query:
   ```sql
   SELECT COUNT(*) FROM internships WHERE status = 'approved';
   ```
4. **Check browser console**: Look for specific error messages
5. **Check network requests**: Verify the API call returns data (not empty array)

### Common Issues:

- **"permission denied"**: RLS policy is blocking access - verify policies are correct
- **Empty array returned**: No approved internships exist, or query is filtering them out
- **"column does not exist"**: Schema cache needs refresh - wait a few minutes or run a query to refresh

## Key Changes Summary

### Profiles RLS Policy (Main Fix)
- **Before**: Only allowed users to view their own profile
- **After**: Allows reading software_house and university profiles (public-facing entities)

This enables Supabase joins like `profiles:software_house_id` to work correctly when students/guests query internships.


