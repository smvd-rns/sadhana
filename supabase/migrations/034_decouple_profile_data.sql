-- 034_decouple_profile_data.sql
-- Phase 1: Create new table with flat columns and migrate existing data

-- 1. Drop old table if exists to ensure schema update
DROP TABLE IF EXISTS user_profile_details CASCADE;

-- 2. Create the new table
CREATE TABLE IF NOT EXISTS user_profile_details (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT, -- Added for easier administrative identification (near user_id)
    
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

-- 2. Migrate existing data from users table
INSERT INTO user_profile_details (
    user_id, 
    user_name,
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
    id as user_id,
    name as user_name,
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
    NOW() as updated_at
FROM users
ON CONFLICT (user_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    edu_1_institution = EXCLUDED.edu_1_institution, edu_1_field = EXCLUDED.edu_1_field, edu_1_year = EXCLUDED.edu_1_year,
    edu_2_institution = EXCLUDED.edu_2_institution, edu_2_field = EXCLUDED.edu_2_field, edu_2_year = EXCLUDED.edu_2_year,
    edu_3_institution = EXCLUDED.edu_3_institution, edu_3_field = EXCLUDED.edu_3_field, edu_3_year = EXCLUDED.edu_3_year,
    edu_4_institution = EXCLUDED.edu_4_institution, edu_4_field = EXCLUDED.edu_4_field, edu_4_year = EXCLUDED.edu_4_year,
    edu_5_institution = EXCLUDED.edu_5_institution, edu_5_field = EXCLUDED.edu_5_field, edu_5_year = EXCLUDED.edu_5_year,
    work_1_company = EXCLUDED.work_1_company, work_1_position = EXCLUDED.work_1_position, work_1_start_date = EXCLUDED.work_1_start_date, work_1_end_date = EXCLUDED.work_1_end_date, work_1_current = EXCLUDED.work_1_current,
    work_2_company = EXCLUDED.work_2_company, work_2_position = EXCLUDED.work_2_position, work_2_start_date = EXCLUDED.work_2_start_date, work_2_end_date = EXCLUDED.work_2_end_date, work_2_current = EXCLUDED.work_2_current,
    work_3_company = EXCLUDED.work_3_company, work_3_position = EXCLUDED.work_3_position, work_3_start_date = EXCLUDED.work_3_start_date, work_3_end_date = EXCLUDED.work_3_end_date, work_3_current = EXCLUDED.work_3_current,
    work_4_company = EXCLUDED.work_4_company, work_4_position = EXCLUDED.work_4_position, work_4_start_date = EXCLUDED.work_4_start_date, work_4_end_date = EXCLUDED.work_4_end_date, work_4_current = EXCLUDED.work_4_current,
    work_5_company = EXCLUDED.work_5_company, work_5_position = EXCLUDED.work_5_position, work_5_start_date = EXCLUDED.work_5_start_date, work_5_end_date = EXCLUDED.work_5_end_date, work_5_current = EXCLUDED.work_5_current,
    language_1 = EXCLUDED.language_1, language_2 = EXCLUDED.language_2, language_3 = EXCLUDED.language_3, language_4 = EXCLUDED.language_4, language_5 = EXCLUDED.language_5,
    skill_1 = EXCLUDED.skill_1, skill_2 = EXCLUDED.skill_2, skill_3 = EXCLUDED.skill_3, skill_4 = EXCLUDED.skill_4, skill_5 = EXCLUDED.skill_5,
    service_1 = EXCLUDED.service_1, service_2 = EXCLUDED.service_2, service_3 = EXCLUDED.service_3, service_4 = EXCLUDED.service_4, service_5 = EXCLUDED.service_5,
    camp_dys = EXCLUDED.camp_dys,
    camp_sankalpa = EXCLUDED.camp_sankalpa,
    camp_sphurti = EXCLUDED.camp_sphurti,
    camp_utkarsh = EXCLUDED.camp_utkarsh,
    camp_faith_and_doubt = EXCLUDED.camp_faith_and_doubt,
    camp_srcgd_workshop = EXCLUDED.camp_srcgd_workshop,
    camp_nistha = EXCLUDED.camp_nistha,
    camp_ashray = EXCLUDED.camp_ashray,
    spbook_third_ssr_1_5 = EXCLUDED.spbook_third_ssr_1_5,
    spbook_third_coming_back = EXCLUDED.spbook_third_coming_back,
    spbook_third_pqpa = EXCLUDED.spbook_third_pqpa,
    spbook_third_matchless_gift = EXCLUDED.spbook_third_matchless_gift,
    spbook_third_raja_vidya = EXCLUDED.spbook_third_raja_vidya,
    spbook_third_elevation_kc = EXCLUDED.spbook_third_elevation_kc,
    spbook_third_beyond_birth_death = EXCLUDED.spbook_third_beyond_birth_death,
    spbook_third_krishna_reservoir = EXCLUDED.spbook_third_krishna_reservoir,
    spbook_fourth_ssr_6_8 = EXCLUDED.spbook_fourth_ssr_6_8,
    spbook_fourth_laws_of_nature = EXCLUDED.spbook_fourth_laws_of_nature,
    spbook_fourth_dharma = EXCLUDED.spbook_fourth_dharma,
    spbook_fourth_second_chance = EXCLUDED.spbook_fourth_second_chance,
    spbook_fourth_isopanishad_1_10 = EXCLUDED.spbook_fourth_isopanishad_1_10,
    spbook_fourth_queen_kunti_video = EXCLUDED.spbook_fourth_queen_kunti_video,
    spbook_fourth_enlightenment_natural = EXCLUDED.spbook_fourth_enlightenment_natural,
    spbook_fourth_krishna_book_1_21 = EXCLUDED.spbook_fourth_krishna_book_1_21,
    spbook_fifth_life_from_life = EXCLUDED.spbook_fifth_life_from_life,
    spbook_fifth_prahlad_teachings = EXCLUDED.spbook_fifth_prahlad_teachings,
    spbook_fifth_journey_self_discovery = EXCLUDED.spbook_fifth_journey_self_discovery,
    spbook_fifth_queen_kunti_hearing = EXCLUDED.spbook_fifth_queen_kunti_hearing,
    spbook_fifth_lord_kapila = EXCLUDED.spbook_fifth_lord_kapila,
    spbook_fifth_nectar_1_6 = EXCLUDED.spbook_fifth_nectar_1_6,
    spbook_fifth_gita_1_6 = EXCLUDED.spbook_fifth_gita_1_6,
    spbook_fifth_krishna_book_24_28 = EXCLUDED.spbook_fifth_krishna_book_24_28,
    spbook_sixth_nectar_7_11 = EXCLUDED.spbook_sixth_nectar_7_11,
    spbook_sixth_path_perfection = EXCLUDED.spbook_sixth_path_perfection,
    spbook_sixth_civilisation_transcendence = EXCLUDED.spbook_sixth_civilisation_transcendence,
    spbook_sixth_hare_krishna_challenge = EXCLUDED.spbook_sixth_hare_krishna_challenge,
    spbook_sixth_gita_7_12 = EXCLUDED.spbook_sixth_gita_7_12,
    spbook_sixth_sb_1st_canto_1_6 = EXCLUDED.spbook_sixth_sb_1st_canto_1_6,
    spbook_sixth_krishna_book_35_59 = EXCLUDED.spbook_sixth_krishna_book_35_59,
    spbook_seventh_gita_13_18 = EXCLUDED.spbook_seventh_gita_13_18,
    spbook_seventh_sb_1st_canto_7_13 = EXCLUDED.spbook_seventh_sb_1st_canto_7_13,
    spbook_seventh_krishna_book_63_78 = EXCLUDED.spbook_seventh_krishna_book_63_78,
    spbook_eighth_sb_1st_canto_14_19 = EXCLUDED.spbook_eighth_sb_1st_canto_14_19,
    spbook_eighth_krishna_book_78_89 = EXCLUDED.spbook_eighth_krishna_book_78_89,
    updated_at = EXCLUDED.updated_at;

-- 3. Enable RLS on new table
ALTER TABLE user_profile_details ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can read own details" ON user_profile_details;
CREATE POLICY "Users can read own details" ON user_profile_details
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own details" ON user_profile_details;
CREATE POLICY "Users can update own details" ON user_profile_details
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert details" ON user_profile_details;
CREATE POLICY "System can insert details" ON user_profile_details
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';
