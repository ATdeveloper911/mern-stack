-- Migration: Add profile_picture column to profiles table
-- Run this in Supabase SQL Editor if the column doesn't exist

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_picture TEXT NULL;

-- Add comment
COMMENT ON COLUMN profiles.profile_picture IS 'Path to profile picture stored in backend/uploads directory';

