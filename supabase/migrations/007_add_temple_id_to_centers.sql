-- Add temple_id column to centers table to link centers with temples
-- This enables cascading dropdown functionality where centers are filtered by selected temple

-- Add temple_id column as a foreign key reference to temples table
ALTER TABLE centers 
ADD COLUMN IF NOT EXISTS temple_id UUID REFERENCES temples(id) ON DELETE SET NULL;

-- Create an index on temple_id for better query performance
CREATE INDEX IF NOT EXISTS idx_centers_temple_id ON centers(temple_id);

-- Add a comment to document the relationship
COMMENT ON COLUMN centers.temple_id IS 'Foreign key reference to temples table - links each center to its parent temple';
