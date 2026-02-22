ALTER TABLE users
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN users.rejection_reason IS 'Reason for rejection if verification status is rejected';
COMMENT ON COLUMN users.reviewed_by IS 'ID of the admin who reviewed the application';
COMMENT ON COLUMN users.reviewed_at IS 'Timestamp when the application was reviewed';
