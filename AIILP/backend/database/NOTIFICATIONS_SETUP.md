# Notification System Setup Guide

This guide explains how to set up and populate the notification system for the AIILP application.

## Setup Steps

### 1. Create the Notifications Table

First, run the SQL script to create the notifications table and set up RLS policies:

```sql
-- Run this in your Supabase SQL Editor
\i backend/database/create_notifications_table.sql
```

Or copy and paste the contents of `create_notifications_table.sql` into the Supabase SQL Editor and execute it.

### 2. Create Database Triggers

Next, set up the triggers that will automatically create notifications when events occur:

```sql
-- Run this in your Supabase SQL Editor
\i backend/database/create_notification_triggers.sql
```

Or copy and paste the contents of `create_notification_triggers.sql` into the Supabase SQL Editor and execute it.

**What these triggers do:**
- **Profile Approval Changes**: Creates notifications for users when their account is approved/rejected
- **Internship Status Changes**: Creates notifications for software houses when their internships are approved/rejected
- **Application Status Changes**: Creates notifications for students/guests when their applications are accepted/rejected
- **New Applications**: Creates notifications for software houses when students apply to their internships
- **New Pending Accounts**: Creates notifications for admins when new guest/software_house accounts are created
- **New Pending Internships**: Creates notifications for admins when new internships are posted

### 3. Populate Existing Notifications (Optional)

If you want to create notifications for existing records in your database, run:

```sql
-- Run this in your Supabase SQL Editor
\i backend/database/populate_existing_notifications.sql
```

Or copy and paste the contents of `populate_existing_notifications.sql` into the Supabase SQL Editor and execute it.

**What this script does:**
- Creates notifications for admin about existing pending accounts
- Creates notifications for admin about existing pending internships
- Creates notifications for software houses about their existing approved/rejected internships
- Creates notifications for software houses about existing applications
- Creates notifications for students/guests about their existing accepted/rejected applications

**Note:** This script uses `NOT EXISTS` checks to avoid creating duplicate notifications, so it's safe to run multiple times.

## Notification Types

The notification system supports the following types:

1. **user_approval** - For account approval/rejection notifications
2. **internship_approval** - For internship approval/rejection notifications
3. **application_status** - For application acceptance/rejection notifications
4. **new_application** - For new application notifications (software house)

## Portal-Specific Notifications

### Admin Portal
- **User Approval Tab**: Notifications about pending/approved/rejected guest and software_house accounts
- **Post Internship Approval Tab**: Notifications about pending/approved/rejected internships
- **All Tab**: All notifications

### Software House Portal
- **Internship Updates Tab**: Notifications about internship approvals/rejections
- **New Applications Tab**: Notifications about new student/guest applications
- **All Tab**: All notifications

### Student/Guest Portal
- **All Notifications**: Application acceptance/rejection notifications

## Testing the System

After setup, you can test the notification system by:

1. **Creating a new account** (guest or software_house) - Admin should receive a notification
2. **Posting a new internship** - Admin should receive a notification
3. **Approving/rejecting an account** - User should receive a notification
4. **Approving/rejecting an internship** - Software house should receive a notification
5. **Applying to an internship** - Software house should receive a notification
6. **Accepting/rejecting an application** - Student/guest should receive a notification

## Troubleshooting

### Notifications not appearing?

1. Check that the triggers are created:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%';
   ```

2. Check that notifications are being created:
   ```sql
   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
   ```

3. Verify RLS policies are correct:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```

### Duplicate notifications?

The populate script includes `NOT EXISTS` checks to prevent duplicates. If you still see duplicates, check:
- Are triggers firing multiple times?
- Is the populate script being run multiple times without the NOT EXISTS checks?

### Admin not receiving notifications?

Make sure:
- There is at least one user with `role = 'admin'` in the profiles table
- The admin user's ID matches the `user_id` in notifications
- RLS policies allow the admin to read their notifications

## Maintenance

The notification system is designed to be self-maintaining through triggers. However, you may want to:

1. **Archive old notifications**: Periodically delete notifications older than a certain date
2. **Clean up read notifications**: Optionally delete read notifications after a certain period
3. **Monitor notification volume**: Check the notifications table size periodically

Example cleanup query:
```sql
-- Delete read notifications older than 90 days
DELETE FROM notifications 
WHERE is_read = true 
AND created_at < NOW() - INTERVAL '90 days';
```

