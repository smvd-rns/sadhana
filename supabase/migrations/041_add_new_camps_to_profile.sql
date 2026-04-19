-- 041_add_new_camps_to_profile.sql
-- Add new camp columns to user_profile_details table

-- 1. Add new boolean columns for the new camps
ALTER TABLE user_profile_details 
ADD COLUMN IF NOT EXISTS camp_bhakti_shastri BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_positive_thinker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_self_manager BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_proactive_leader BOOLEAN DEFAULT FALSE;

-- 2. Update the updated_at timestamp
UPDATE user_profile_details SET updated_at = NOW();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
