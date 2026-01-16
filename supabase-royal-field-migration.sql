-- Add royal column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS royal BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_royal ON users(royal);

-- Update RLS policies (optional, if needed, but usually redundant for public profile fields if open)
-- Existing policies should cover basic read/update if they are broad enough.
