-- Migration: Add Spiritual Information Fields to Users Table
-- Run this SQL in your Supabase SQL Editor to add the new columns to existing users table

-- Add spiritual information columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS initiation_status TEXT CHECK (initiation_status IN ('initiated', 'aspiring')),
ADD COLUMN IF NOT EXISTS initiated_name TEXT,
ADD COLUMN IF NOT EXISTS spiritual_master_name TEXT,
ADD COLUMN IF NOT EXISTS aspiring_spiritual_master_name TEXT,
ADD COLUMN IF NOT EXISTS chanting_since DATE,
ADD COLUMN IF NOT EXISTS rounds INTEGER,
ADD COLUMN IF NOT EXISTS ashram TEXT CHECK (ashram IN ('Gauranga Sabha', 'Nityananda Sabha', 'Grihastha Ashram', 'Brahmachari Ashram', 'Not Decided')),
ADD COLUMN IF NOT EXISTS royal_member TEXT CHECK (royal_member IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS brahmachari_counselor TEXT,
ADD COLUMN IF NOT EXISTS grihastha_counselor TEXT;

-- Add ashram column to counselors table
ALTER TABLE counselors
ADD COLUMN IF NOT EXISTS ashram TEXT CHECK (ashram IN ('Brahmachari Ashram', 'Grihastha Ashram'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_ashram ON users(ashram);
CREATE INDEX IF NOT EXISTS idx_users_brahmachari_counselor ON users(brahmachari_counselor);
CREATE INDEX IF NOT EXISTS idx_users_grihastha_counselor ON users(grihastha_counselor);
CREATE INDEX IF NOT EXISTS idx_counselors_ashram ON counselors(ashram);
