-- Migration: Add relative contact and health fields to users table
-- Run this in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS relative_1_name TEXT,
ADD COLUMN IF NOT EXISTS relative_1_relationship TEXT,
ADD COLUMN IF NOT EXISTS relative_1_phone TEXT,
ADD COLUMN IF NOT EXISTS relative_2_name TEXT,
ADD COLUMN IF NOT EXISTS relative_2_relationship TEXT,
ADD COLUMN IF NOT EXISTS relative_2_phone TEXT,
ADD COLUMN IF NOT EXISTS relative_3_name TEXT,
ADD COLUMN IF NOT EXISTS relative_3_relationship TEXT,
ADD COLUMN IF NOT EXISTS relative_3_phone TEXT,
ADD COLUMN IF NOT EXISTS health_chronic_disease TEXT;

-- Comments for documentation
COMMENT ON COLUMN users.relative_1_relationship IS 'Options: Mother, Father, Brother, Sister, Spouse, Son, Daughter, Other';
COMMENT ON COLUMN users.relative_2_relationship IS 'Options: Mother, Father, Brother, Sister, Spouse, Son, Daughter, Other';
COMMENT ON COLUMN users.relative_3_relationship IS 'Options: Mother, Father, Brother, Sister, Spouse, Son, Daughter, Other';
COMMENT ON COLUMN users.health_chronic_disease IS 'Free text for listing chronic diseases or health conditions';
