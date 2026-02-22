-- Add spiritual columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS introduced_to_kc_in TEXT,
ADD COLUMN IF NOT EXISTS parent_temple TEXT,
ADD COLUMN IF NOT EXISTS parent_center TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.introduced_to_kc_in IS 'Year or approximation of when the user was introduced to Krishna Consciousness';
COMMENT ON COLUMN users.parent_temple IS 'The parent temple connected to the users current center/temple';
COMMENT ON COLUMN users.parent_center IS 'The parent center connected to the users current center';
