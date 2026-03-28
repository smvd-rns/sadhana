-- 039_update_work_experience_fields.sql
-- Adding work_i_location to user_profile_details

-- 1. Add new columns for location
ALTER TABLE user_profile_details 
ADD COLUMN IF NOT EXISTS work_1_location TEXT,
ADD COLUMN IF NOT EXISTS work_2_location TEXT,
ADD COLUMN IF NOT EXISTS work_3_location TEXT,
ADD COLUMN IF NOT EXISTS work_4_location TEXT,
ADD COLUMN IF NOT EXISTS work_5_location TEXT;

-- 2. Re-calculate updated_at
UPDATE user_profile_details SET updated_at = NOW();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
