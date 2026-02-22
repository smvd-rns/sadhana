-- Add temple_name column to centers table
-- This stores the temple name directly in the centers table as requested

ALTER TABLE centers 
ADD COLUMN IF NOT EXISTS temple_name TEXT;

-- Add a comment
COMMENT ON COLUMN centers.temple_name IS 'Name of the parent temple, stored for easy reference';
