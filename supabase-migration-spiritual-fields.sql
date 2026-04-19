-- Migration: Add Spiritual Information Fields to Users Table
-- Run this SQL in your Supabase SQL Editor to add the new columns to existing users table

-- Drop the existing constraint FIRST to allow updates
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ashram_check;

-- Now update any existing invalid ashram values to valid ones
UPDATE users
SET ashram = CASE
  WHEN ashram = 'Student' THEN 'Student and not decided'
  WHEN ashram = 'Not decided' THEN 'Student and not decided'
  WHEN ashram = 'Not Decided' THEN 'Student and not decided'
  WHEN ashram = 'Grihastha Ashram' THEN 'Grihastha'
  WHEN ashram = 'Brahmachari Ashram' THEN 'Brahmachari'
  WHEN ashram ILIKE '%brahmachari%' THEN 'Brahmachari'
  WHEN ashram ILIKE '%grihastha%' THEN 'Grihastha'
  WHEN ashram ILIKE '%student%' THEN 'Student and not decided'
  WHEN ashram ILIKE '%not decided%' THEN 'Student and not decided'
  ELSE 'Student and not decided' -- Default fallback for any other invalid values
END
WHERE ashram IS NOT NULL;

-- Add the new constraint with updated allowed values
ALTER TABLE users
ADD CONSTRAINT users_ashram_check
CHECK (ashram IN ('Student and not decided', 'Working and not decided', 'Gauranga Sabha', 'Nityananda Sabha', 'Grihastha', 'Brahmachari', 'Staying Single (Not planning to marry)'));

-- Add spiritual information columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS initiation_status TEXT CHECK (initiation_status IN ('initiated', 'aspiring')),
ADD COLUMN IF NOT EXISTS initiated_name TEXT,
ADD COLUMN IF NOT EXISTS spiritual_master_name TEXT,
ADD COLUMN IF NOT EXISTS aspiring_spiritual_master_name TEXT,
ADD COLUMN IF NOT EXISTS chanting_since DATE,
ADD COLUMN IF NOT EXISTS rounds INTEGER,
ADD COLUMN IF NOT EXISTS royal_member TEXT CHECK (royal_member IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS brahmachari_counselor TEXT,
ADD COLUMN IF NOT EXISTS grihastha_counselor TEXT;

-- Add ashram column to counselors table
ALTER TABLE counselors
ADD COLUMN IF NOT EXISTS ashram TEXT CHECK (ashram IN ('Brahmachari', 'Grihastha'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_ashram ON users(ashram);
CREATE INDEX IF NOT EXISTS idx_users_brahmachari_counselor ON users(brahmachari_counselor);
CREATE INDEX IF NOT EXISTS idx_users_grihastha_counselor ON users(grihastha_counselor);
CREATE INDEX IF NOT EXISTS idx_counselors_ashram ON counselors(ashram);
