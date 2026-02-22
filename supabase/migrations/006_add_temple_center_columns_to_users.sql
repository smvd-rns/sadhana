-- Add temple, center, and KC introduction columns to users table
-- Migration: 006_add_temple_center_columns_to_users

ALTER TABLE users
ADD COLUMN IF NOT EXISTS parent_temple TEXT,
ADD COLUMN IF NOT EXISTS parent_center TEXT,
ADD COLUMN IF NOT EXISTS current_temple TEXT,
ADD COLUMN IF NOT EXISTS current_center TEXT,
ADD COLUMN IF NOT EXISTS introduced_to_kc_in TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.parent_temple IS 'The temple where the user was originally introduced to Krishna Consciousness';
COMMENT ON COLUMN users.parent_center IS 'The center where the user was originally introduced to Krishna Consciousness';
COMMENT ON COLUMN users.current_temple IS 'The temple where the user currently attends';
COMMENT ON COLUMN users.current_center IS 'The center where the user currently attends';
COMMENT ON COLUMN users.introduced_to_kc_in IS 'Year or date when the user was introduced to Krishna Consciousness';
