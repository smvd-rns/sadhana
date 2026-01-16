-- Migration: Add counselor email columns to users table
-- Run this SQL in your Supabase SQL Editor

-- Add columns for counselor email IDs
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS brahmachari_counselor_email TEXT,
ADD COLUMN IF NOT EXISTS grihastha_counselor_email TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_brahmachari_counselor_email 
ON users(brahmachari_counselor_email) 
WHERE brahmachari_counselor_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_grihastha_counselor_email 
ON users(grihastha_counselor_email) 
WHERE grihastha_counselor_email IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.brahmachari_counselor_email IS 'Email ID of the Brahmachari counselor assigned to this user';
COMMENT ON COLUMN users.grihastha_counselor_email IS 'Email ID of the Grihastha counselor assigned to this user';
