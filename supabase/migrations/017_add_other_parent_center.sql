-- 017_add_other_parent_center.sql
-- Add column for storing manual entries for parent center

ALTER TABLE users ADD COLUMN IF NOT EXISTS other_parent_center TEXT;

COMMENT ON COLUMN users.other_parent_center IS 'Manually entered parent center name when "Other" is selected';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
