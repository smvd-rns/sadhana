-- Add other_parent_temple column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS other_parent_temple TEXT;

-- Sync existing data from hierarchy JSONB to the new column for users who already have it
UPDATE users 
SET other_parent_temple = (hierarchy->>'otherParentTemple')
WHERE parent_temple = 'Other' 
AND (other_parent_temple IS NULL OR other_parent_temple = '');

-- Update RLS if necessary (usually standard columns are covered by existing policies)
-- Assuming existing policies cover new columns in the users table.
