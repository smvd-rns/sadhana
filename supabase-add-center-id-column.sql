-- Migration: Add center_id column to users table
-- Run this SQL in your Supabase SQL Editor

-- Add center_id column to store the center ID (from centers table or local centers)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS center_id TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_center_id 
ON users(center_id) 
WHERE center_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.center_id IS 'ID of the center from the centers table or local centers data. Used for accurate center matching.';

-- Optional: Backfill existing center names to center IDs if possible
-- This would require matching center names to IDs from your centers data
-- You can run this manually after identifying center IDs for existing centers
