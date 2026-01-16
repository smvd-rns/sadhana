-- Migration: Add BC Voice Manager request fields to users table
-- Run this SQL in your Supabase SQL Editor

-- Add columns for BC Voice Manager request tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bc_voice_manager_request_status TEXT CHECK (bc_voice_manager_request_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS bc_voice_manager_request_subject TEXT,
ADD COLUMN IF NOT EXISTS bc_voice_manager_request_message TEXT,
ADD COLUMN IF NOT EXISTS bc_voice_manager_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bc_voice_manager_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bc_voice_manager_reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS bc_voice_manager_request_notes TEXT,
ADD COLUMN IF NOT EXISTS bc_voice_manager_requested_centers TEXT[], -- Array of center IDs/names requested by user
ADD COLUMN IF NOT EXISTS bc_voice_manager_approved_centers TEXT[]; -- Array of center IDs/names approved by admin

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_bc_voice_manager_request_status 
ON users(bc_voice_manager_request_status) 
WHERE bc_voice_manager_request_status IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.bc_voice_manager_request_status IS 'Status of BC Voice Manager role request: pending, approved, or rejected';
COMMENT ON COLUMN users.bc_voice_manager_request_subject IS 'Subject of the BC Voice Manager request for easy identification';
COMMENT ON COLUMN users.bc_voice_manager_request_message IS 'User message explaining why they want to be a BC Voice Manager';
COMMENT ON COLUMN users.bc_voice_manager_requested_at IS 'Timestamp when user requested BC Voice Manager role';
COMMENT ON COLUMN users.bc_voice_manager_reviewed_at IS 'Timestamp when super admin reviewed the request';
COMMENT ON COLUMN users.bc_voice_manager_reviewed_by IS 'User ID of the super admin who reviewed the request';
COMMENT ON COLUMN users.bc_voice_manager_request_notes IS 'Admin notes about the request review';
COMMENT ON COLUMN users.bc_voice_manager_requested_centers IS 'Array of center IDs/names that the user requested to manage';
COMMENT ON COLUMN users.bc_voice_manager_approved_centers IS 'Array of center IDs/names approved by super admin for this BC Voice Manager';
