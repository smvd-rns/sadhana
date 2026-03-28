-- 038_update_education_fields.sql
-- Renaming edu_i_field to edu_i_degree_branch and splitting edu_i_year into start/end years

-- 1. Add new columns for start and end years
ALTER TABLE user_profile_details 
ADD COLUMN IF NOT EXISTS edu_1_start_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_1_end_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_2_start_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_2_end_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_3_start_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_3_end_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_4_start_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_4_end_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_5_start_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_5_end_year INTEGER;

-- 2. Add new columns for degree branch (renaming field)
ALTER TABLE user_profile_details 
ADD COLUMN IF NOT EXISTS edu_1_degree_branch TEXT,
ADD COLUMN IF NOT EXISTS edu_2_degree_branch TEXT,
ADD COLUMN IF NOT EXISTS edu_3_degree_branch TEXT,
ADD COLUMN IF NOT EXISTS edu_4_degree_branch TEXT,
ADD COLUMN IF NOT EXISTS edu_5_degree_branch TEXT;

-- 3. Migrate existing data
UPDATE user_profile_details SET
    edu_1_degree_branch = edu_1_field,
    edu_1_end_year = edu_1_year,
    edu_2_degree_branch = edu_2_field,
    edu_2_end_year = edu_2_year,
    edu_3_degree_branch = edu_3_field,
    edu_3_end_year = edu_3_year,
    edu_4_degree_branch = edu_4_field,
    edu_4_end_year = edu_4_year,
    edu_5_degree_branch = edu_5_field,
    edu_5_end_year = edu_5_year;

-- 4. Re-calculate updated_at
UPDATE user_profile_details SET updated_at = NOW();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
