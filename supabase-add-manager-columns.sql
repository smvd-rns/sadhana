-- Migration: Add zone and assigned geographic area columns to users table
-- Run this SQL in your Supabase SQL Editor
-- These columns support the new Zone Manager, State Manager, and City Manager roles

-- Add zone column to store the user's geographic zone
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS zone TEXT;

-- Add assigned_zone column for Zone Managers (role 7)
-- This stores which zone a Zone Manager is responsible for
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_zone TEXT;

-- Add assigned_state column for State Managers (role 6)
-- This stores which state a State Manager is responsible for
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_state TEXT;

-- Add assigned_city column for City Managers (role 5)
-- This stores which city a City Manager is responsible for
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_city TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_zone 
ON users(zone) 
WHERE zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_zone 
ON users(assigned_zone) 
WHERE assigned_zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_state 
ON users(assigned_state) 
WHERE assigned_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_city 
ON users(assigned_city) 
WHERE assigned_city IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.zone IS 'Geographic zone where the user belongs. Used for Zone Manager filtering.';
COMMENT ON COLUMN users.assigned_zone IS 'Zone assigned to Zone Manager (role 7). Determines which users they can manage.';
COMMENT ON COLUMN users.assigned_state IS 'State assigned to State Manager (role 6). Determines which users they can manage.';
COMMENT ON COLUMN users.assigned_city IS 'City assigned to City Manager (role 5). Determines which users they can manage.';

-- Optional: Define zones (example - customize based on your organization)
-- You can create a zones table or simply use these as reference values
/*
Example zone definitions:
- North Zone: Delhi, Punjab, Haryana, Uttar Pradesh, Uttarakhand, Himachal Pradesh, Jammu & Kashmir
- South Zone: Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, Telangana
- West Zone: Maharashtra, Gujarat, Rajasthan, Goa
- East Zone: West Bengal, Odisha, Bihar, Jharkhand, Assam
- Central Zone: Madhya Pradesh, Chhattisgarh

To populate zones for existing users, you would run:
UPDATE users 
SET zone = 'North Zone' 
WHERE state IN ('Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Uttarakhand', 'Himachal Pradesh', 'Jammu & Kashmir');

UPDATE users 
SET zone = 'South Zone' 
WHERE state IN ('Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana');

-- etc. for other zones
*/

-- Verification queries (run after migration)
-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('zone', 'assigned_zone', 'assigned_state', 'assigned_city');

-- Check if indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE 'idx_users_%zone%' 
OR indexname LIKE 'idx_users_assigned_%';
