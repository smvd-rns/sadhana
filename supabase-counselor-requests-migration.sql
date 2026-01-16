-- Migration: Add counselor request fields to users table
-- Run this SQL in your Supabase SQL Editor

-- Add columns for counselor request tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS counselor_request_status TEXT CHECK (counselor_request_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS counselor_request_message TEXT,
ADD COLUMN IF NOT EXISTS counselor_request_email TEXT,
ADD COLUMN IF NOT EXISTS counselor_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counselor_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS counselor_reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS counselor_request_notes TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_counselor_request_status 
ON users(counselor_request_status) 
WHERE counselor_request_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.counselor_request_status IS 'Status of counselor role request: pending, approved, or rejected';
COMMENT ON COLUMN users.counselor_request_message IS 'User message explaining why they want to be a counselor';
COMMENT ON COLUMN users.counselor_request_email IS 'Email address used for counselor verification';
COMMENT ON COLUMN users.counselor_requested_at IS 'Timestamp when user requested counselor role';
COMMENT ON COLUMN users.counselor_reviewed_at IS 'Timestamp when super admin reviewed the request';
COMMENT ON COLUMN users.counselor_reviewed_by IS 'User ID of the super admin who reviewed the request';
COMMENT ON COLUMN users.counselor_request_notes IS 'Admin notes about the request review';
