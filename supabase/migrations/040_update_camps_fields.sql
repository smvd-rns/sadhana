-- 040_update_camps_fields.sql
-- Adding new camps and renaming existing ones in user_profile_details

-- 1. Add new columns
ALTER TABLE user_profile_details 
ADD COLUMN IF NOT EXISTS camp_ftec BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_mtec BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_sharanagati BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_idc BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_nishtha BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_ashraya BOOLEAN DEFAULT FALSE;

-- 2. Data Migration
-- Copy existing Nistha data to Nishtha
UPDATE user_profile_details SET camp_nishtha = camp_nistha WHERE camp_nistha IS NOT NULL;
-- Copy existing Ashray data to Ashraya
UPDATE user_profile_details SET camp_ashraya = camp_ashray WHERE camp_ashray IS NOT NULL;

-- 3. Re-calculate updated_at
UPDATE user_profile_details SET updated_at = NOW();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
