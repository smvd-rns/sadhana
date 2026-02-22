-- 010_add_other_columns.sql
-- Add columns for storing manual entries for counselor and center

ALTER TABLE users ADD COLUMN IF NOT EXISTS other_counselor TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS other_center TEXT;

COMMENT ON COLUMN users.other_counselor IS 'Manually entered counselor name when "Other" is selected';
COMMENT ON COLUMN users.other_center IS 'Manually entered center name when "Other" is selected';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
