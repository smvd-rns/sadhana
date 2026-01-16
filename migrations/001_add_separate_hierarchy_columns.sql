-- Migration: Add separate columns for hierarchy fields
-- This migration adds state, city, center, and counselor as separate columns
-- and migrates existing data from the hierarchy JSONB column

-- Step 1: Add new columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS center TEXT,
ADD COLUMN IF NOT EXISTS counselor TEXT;

-- Step 2: Migrate existing data from hierarchy JSONB to new columns
UPDATE users 
SET 
  state = hierarchy->>'state',
  city = hierarchy->>'city',
  center = hierarchy->>'center',
  counselor = hierarchy->>'counselor'
WHERE hierarchy IS NOT NULL AND hierarchy != '{}'::jsonb;

-- Step 3: Create indexes on new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_center ON users(center);
CREATE INDEX IF NOT EXISTS idx_users_counselor ON users(counselor);

-- Step 4: Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_state_city ON users(state, city);
CREATE INDEX IF NOT EXISTS idx_users_state_city_center ON users(state, city, center);

-- Note: The hierarchy JSONB column is kept for backward compatibility
-- You can drop it later after verifying all data is migrated:
-- ALTER TABLE users DROP COLUMN hierarchy;
