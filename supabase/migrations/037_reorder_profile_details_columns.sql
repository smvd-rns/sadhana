-- 037_reorder_profile_details_columns.sql
-- Safely reorder user_name to the top of the table

-- 1. Rename existing table
ALTER TABLE user_profile_details RENAME TO user_profile_details_old;

-- 2. Create the new table with desired column order
CREATE TABLE user_profile_details (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT, -- Positioned at the top
    
    -- Education columns (Flat)
    edu_1_institution TEXT, edu_1_field TEXT, edu_1_year INTEGER,
    edu_2_institution TEXT, edu_2_field TEXT, edu_2_year INTEGER,
    edu_3_institution TEXT, edu_3_field TEXT, edu_3_year INTEGER,
    edu_4_institution TEXT, edu_4_field TEXT, edu_4_year INTEGER,
    edu_5_institution TEXT, edu_5_field TEXT, edu_5_year INTEGER,
    
    -- Work experience columns (Flat)
    work_1_company TEXT, work_1_position TEXT, work_1_start_date DATE, work_1_end_date DATE, work_1_current BOOLEAN DEFAULT FALSE,
    work_2_company TEXT, work_2_position TEXT, work_2_start_date DATE, work_2_end_date DATE, work_2_current BOOLEAN DEFAULT FALSE,
    work_3_company TEXT, work_3_position TEXT, work_3_start_date DATE, work_3_end_date DATE, work_3_current BOOLEAN DEFAULT FALSE,
    work_4_company TEXT, work_4_position TEXT, work_4_start_date DATE, work_4_end_date DATE, work_4_current BOOLEAN DEFAULT FALSE,
    work_5_company TEXT, work_5_position TEXT, work_5_start_date DATE, work_5_end_date DATE, work_5_current BOOLEAN DEFAULT FALSE,
    
    -- Language columns (Flat)
    language_1 TEXT, language_2 TEXT, language_3 TEXT, language_4 TEXT, language_5 TEXT,
    
    -- Skills columns (Flat)
    skill_1 TEXT, skill_2 TEXT, skill_3 TEXT, skill_4 TEXT, skill_5 TEXT,
    
    -- Services rendered columns (Flat)
    service_1 TEXT, service_2 TEXT, service_3 TEXT, service_4 TEXT, service_5 TEXT,

    -- Camp columns (Flat)
    camp_dys BOOLEAN DEFAULT FALSE,
    camp_sankalpa BOOLEAN DEFAULT FALSE,
    camp_sphurti BOOLEAN DEFAULT FALSE,
    camp_utkarsh BOOLEAN DEFAULT FALSE,
    camp_faith_and_doubt BOOLEAN DEFAULT FALSE,
    camp_srcgd_workshop BOOLEAN DEFAULT FALSE,
    camp_nistha BOOLEAN DEFAULT FALSE,
    camp_ashray BOOLEAN DEFAULT FALSE,

    -- SP Book columns (Flat)
    spbook_third_ssr_1_5 BOOLEAN DEFAULT FALSE,
    spbook_third_coming_back BOOLEAN DEFAULT FALSE,
    spbook_third_pqpa BOOLEAN DEFAULT FALSE,
    spbook_third_matchless_gift BOOLEAN DEFAULT FALSE,
    spbook_third_raja_vidya BOOLEAN DEFAULT FALSE,
    spbook_third_elevation_kc BOOLEAN DEFAULT FALSE,
    spbook_third_beyond_birth_death BOOLEAN DEFAULT FALSE,
    spbook_third_krishna_reservoir BOOLEAN DEFAULT FALSE,
    spbook_fourth_ssr_6_8 BOOLEAN DEFAULT FALSE,
    spbook_fourth_laws_of_nature BOOLEAN DEFAULT FALSE,
    spbook_fourth_dharma BOOLEAN DEFAULT FALSE,
    spbook_fourth_second_chance BOOLEAN DEFAULT FALSE,
    spbook_fourth_isopanishad_1_10 BOOLEAN DEFAULT FALSE,
    spbook_fourth_queen_kunti_video BOOLEAN DEFAULT FALSE,
    spbook_fourth_enlightenment_natural BOOLEAN DEFAULT FALSE,
    spbook_fourth_krishna_book_1_21 BOOLEAN DEFAULT FALSE,
    spbook_fifth_life_from_life BOOLEAN DEFAULT FALSE,
    spbook_fifth_prahlad_teachings BOOLEAN DEFAULT FALSE,
    spbook_fifth_journey_self_discovery BOOLEAN DEFAULT FALSE,
    spbook_fifth_queen_kunti_hearing BOOLEAN DEFAULT FALSE,
    spbook_fifth_lord_kapila BOOLEAN DEFAULT FALSE,
    spbook_fifth_nectar_1_6 BOOLEAN DEFAULT FALSE,
    spbook_fifth_gita_1_6 BOOLEAN DEFAULT FALSE,
    spbook_fifth_krishna_book_24_28 BOOLEAN DEFAULT FALSE,
    spbook_sixth_nectar_7_11 BOOLEAN DEFAULT FALSE,
    spbook_sixth_path_perfection BOOLEAN DEFAULT FALSE,
    spbook_sixth_civilisation_transcendence BOOLEAN DEFAULT FALSE,
    spbook_sixth_hare_krishna_challenge BOOLEAN DEFAULT FALSE,
    spbook_sixth_gita_7_12 BOOLEAN DEFAULT FALSE,
    spbook_sixth_sb_1st_canto_1_6 BOOLEAN DEFAULT FALSE,
    spbook_sixth_krishna_book_35_59 BOOLEAN DEFAULT FALSE,
    spbook_seventh_gita_13_18 BOOLEAN DEFAULT FALSE,
    spbook_seventh_sb_1st_canto_7_13 BOOLEAN DEFAULT FALSE,
    spbook_seventh_krishna_book_63_78 BOOLEAN DEFAULT FALSE,
    spbook_eighth_sb_1st_canto_14_19 BOOLEAN DEFAULT FALSE,
    spbook_eighth_krishna_book_78_89 BOOLEAN DEFAULT FALSE,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Copy data from the old table (Explicit column selection to avoid count mismatch)
INSERT INTO user_profile_details (
    user_id, 
    edu_1_institution, edu_1_field, edu_1_year,
    edu_2_institution, edu_2_field, edu_2_year,
    edu_3_institution, edu_3_field, edu_3_year,
    edu_4_institution, edu_4_field, edu_4_year,
    edu_5_institution, edu_5_field, edu_5_year,
    work_1_company, work_1_position, work_1_start_date, work_1_end_date, work_1_current,
    work_2_company, work_2_position, work_2_start_date, work_2_end_date, work_2_current,
    work_3_company, work_3_position, work_3_start_date, work_3_end_date, work_3_current,
    work_4_company, work_4_position, work_4_start_date, work_4_end_date, work_4_current,
    work_5_company, work_5_position, work_5_start_date, work_5_end_date, work_5_current,
    language_1, language_2, language_3, language_4, language_5,
    skill_1, skill_2, skill_3, skill_4, skill_5,
    service_1, service_2, service_3, service_4, service_5,
    camp_dys, camp_sankalpa, camp_sphurti, camp_utkarsh, camp_faith_and_doubt, camp_srcgd_workshop, camp_nistha, camp_ashray,
    spbook_third_ssr_1_5, spbook_third_coming_back, spbook_third_pqpa, spbook_third_matchless_gift, spbook_third_raja_vidya, spbook_third_elevation_kc, spbook_third_beyond_birth_death, spbook_third_krishna_reservoir,
    spbook_fourth_ssr_6_8, spbook_fourth_laws_of_nature, spbook_fourth_dharma, spbook_fourth_second_chance, spbook_fourth_isopanishad_1_10, spbook_fourth_queen_kunti_video, spbook_fourth_enlightenment_natural, spbook_fourth_krishna_book_1_21,
    spbook_fifth_life_from_life, spbook_fifth_prahlad_teachings, spbook_fifth_journey_self_discovery, spbook_fifth_queen_kunti_hearing, spbook_fifth_lord_kapila, spbook_fifth_nectar_1_6, spbook_fifth_gita_1_6, spbook_fifth_krishna_book_24_28,
    spbook_sixth_nectar_7_11, spbook_sixth_path_perfection, spbook_sixth_civilisation_transcendence, spbook_sixth_hare_krishna_challenge, spbook_sixth_gita_7_12, spbook_sixth_sb_1st_canto_1_6, spbook_sixth_krishna_book_35_59,
    spbook_seventh_gita_13_18, spbook_seventh_sb_1st_canto_7_13, spbook_seventh_krishna_book_63_78,
    spbook_eighth_sb_1st_canto_14_19, spbook_eighth_krishna_book_78_89,
    updated_at
)
SELECT 
    user_id, 
    edu_1_institution, edu_1_field, edu_1_year,
    edu_2_institution, edu_2_field, edu_2_year,
    edu_3_institution, edu_3_field, edu_3_year,
    edu_4_institution, edu_4_field, edu_4_year,
    edu_5_institution, edu_5_field, edu_5_year,
    work_1_company, work_1_position, work_1_start_date, work_1_end_date, work_1_current,
    work_2_company, work_2_position, work_2_start_date, work_2_end_date, work_2_current,
    work_3_company, work_3_position, work_3_start_date, work_3_end_date, work_3_current,
    work_4_company, work_4_position, work_4_start_date, work_4_end_date, work_4_current,
    work_5_company, work_5_position, work_5_start_date, work_5_end_date, work_5_current,
    language_1, language_2, language_3, language_4, language_5,
    skill_1, skill_2, skill_3, skill_4, skill_5,
    service_1, service_2, service_3, service_4, service_5,
    camp_dys, camp_sankalpa, camp_sphurti, camp_utkarsh, camp_faith_and_doubt, camp_srcgd_workshop, camp_nistha, camp_ashray,
    spbook_third_ssr_1_5, spbook_third_coming_back, spbook_third_pqpa, spbook_third_matchless_gift, spbook_third_raja_vidya, spbook_third_elevation_kc, spbook_third_beyond_birth_death, spbook_third_krishna_reservoir,
    spbook_fourth_ssr_6_8, spbook_fourth_laws_of_nature, spbook_fourth_dharma, spbook_fourth_second_chance, spbook_fourth_isopanishad_1_10, spbook_fourth_queen_kunti_video, spbook_fourth_enlightenment_natural, spbook_fourth_krishna_book_1_21,
    spbook_fifth_life_from_life, spbook_fifth_prahlad_teachings, spbook_fifth_journey_self_discovery, spbook_fifth_queen_kunti_hearing, spbook_fifth_lord_kapila, spbook_fifth_nectar_1_6, spbook_fifth_gita_1_6, spbook_fifth_krishna_book_24_28,
    spbook_sixth_nectar_7_11, spbook_sixth_path_perfection, spbook_sixth_civilisation_transcendence, spbook_sixth_hare_krishna_challenge, spbook_sixth_gita_7_12, spbook_sixth_sb_1st_canto_1_6, spbook_sixth_krishna_book_35_59,
    spbook_seventh_gita_13_18, spbook_seventh_sb_1st_canto_7_13, spbook_seventh_krishna_book_63_78,
    spbook_eighth_sb_1st_canto_14_19, spbook_eighth_krishna_book_78_89,
    updated_at 
FROM user_profile_details_old;

-- 4. Populate the user_name from core users table
UPDATE user_profile_details upd
SET user_name = u.name
FROM users u
WHERE upd.user_id = u.id;

-- 5. Restore RLS
ALTER TABLE user_profile_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own details" ON user_profile_details;
CREATE POLICY "Users can read own details" ON user_profile_details
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own details" ON user_profile_details;
CREATE POLICY "Users can update own details" ON user_profile_details
    FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert details" ON user_profile_details;
CREATE POLICY "System can insert details" ON user_profile_details
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 6. Clean up the old table
DROP TABLE user_profile_details_old CASCADE;

-- 7. Force schema reload
NOTIFY pgrst, 'reload schema';
