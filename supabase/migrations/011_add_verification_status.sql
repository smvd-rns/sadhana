-- 011_add_verification_status.sql
-- Add verification_status column to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'approved';

-- Update existing users to have 'approved' status if they are null (just in case default didn't catch them or for safety)
UPDATE users SET verification_status = 'approved' WHERE verification_status IS NULL;

-- Add comment explaining the values
COMMENT ON COLUMN users.verification_status IS 'Status of user verification: pending, approved, rejected. Default is approved for backward compatibility.';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
