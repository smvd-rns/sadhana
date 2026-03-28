-- 035_cleanup_users_columns.sql
-- Phase 2: Drop decoupled profile columns from users table

ALTER TABLE users
    -- Drop Education columns
    DROP COLUMN IF EXISTS edu_1_institution, DROP COLUMN IF EXISTS edu_1_field, DROP COLUMN IF EXISTS edu_1_year,
    DROP COLUMN IF EXISTS edu_2_institution, DROP COLUMN IF EXISTS edu_2_field, DROP COLUMN IF EXISTS edu_2_year,
    DROP COLUMN IF EXISTS edu_3_institution, DROP COLUMN IF EXISTS edu_3_field, DROP COLUMN IF EXISTS edu_3_year,
    DROP COLUMN IF EXISTS edu_4_institution, DROP COLUMN IF EXISTS edu_4_field, DROP COLUMN IF EXISTS edu_4_year,
    DROP COLUMN IF EXISTS edu_5_institution, DROP COLUMN IF EXISTS edu_5_field, DROP COLUMN IF EXISTS edu_5_year,
    
    -- Drop Work experience columns
    DROP COLUMN IF EXISTS work_1_company, DROP COLUMN IF EXISTS work_1_position, DROP COLUMN IF EXISTS work_1_start_date, DROP COLUMN IF EXISTS work_1_end_date, DROP COLUMN IF EXISTS work_1_current,
    DROP COLUMN IF EXISTS work_2_company, DROP COLUMN IF EXISTS work_2_position, DROP COLUMN IF EXISTS work_2_start_date, DROP COLUMN IF EXISTS work_2_end_date, DROP COLUMN IF EXISTS work_2_current,
    DROP COLUMN IF EXISTS work_3_company, DROP COLUMN IF EXISTS work_3_position, DROP COLUMN IF EXISTS work_3_start_date, DROP COLUMN IF EXISTS work_3_end_date, DROP COLUMN IF EXISTS work_3_current,
    DROP COLUMN IF EXISTS work_4_company, DROP COLUMN IF EXISTS work_4_position, DROP COLUMN IF EXISTS work_4_start_date, DROP COLUMN IF EXISTS work_4_end_date, DROP COLUMN IF EXISTS work_4_current,
    DROP COLUMN IF EXISTS work_5_company, DROP COLUMN IF EXISTS work_5_position, DROP COLUMN IF EXISTS work_5_start_date, DROP COLUMN IF EXISTS work_5_end_date, DROP COLUMN IF EXISTS work_5_current,
    
    -- Drop Language columns
    DROP COLUMN IF EXISTS language_1, DROP COLUMN IF EXISTS language_2, DROP COLUMN IF EXISTS language_3, DROP COLUMN IF EXISTS language_4, DROP COLUMN IF EXISTS language_5,
    
    -- Drop Skills columns
    DROP COLUMN IF EXISTS skill_1, DROP COLUMN IF EXISTS skill_2, DROP COLUMN IF EXISTS skill_3, DROP COLUMN IF EXISTS skill_4, DROP COLUMN IF EXISTS skill_5,
    
    -- Drop Services columns
    DROP COLUMN IF EXISTS service_1, DROP COLUMN IF EXISTS service_2, DROP COLUMN IF EXISTS service_3, DROP COLUMN IF EXISTS service_4, DROP COLUMN IF EXISTS service_5,

    -- Drop Camp columns
    DROP COLUMN IF EXISTS camp_dys, DROP COLUMN IF EXISTS camp_sankalpa, DROP COLUMN IF EXISTS camp_sphurti, DROP COLUMN IF EXISTS camp_utkarsh, DROP COLUMN IF EXISTS camp_faith_and_doubt, DROP COLUMN IF EXISTS camp_srcgd_workshop, DROP COLUMN IF EXISTS camp_nistha, DROP COLUMN IF EXISTS camp_ashray,

    -- Drop SP Book columns
    DROP COLUMN IF EXISTS spbook_third_ssr_1_5, DROP COLUMN IF EXISTS spbook_third_coming_back, DROP COLUMN IF EXISTS spbook_third_pqpa, DROP COLUMN IF EXISTS spbook_third_matchless_gift, DROP COLUMN IF EXISTS spbook_third_raja_vidya, DROP COLUMN IF EXISTS spbook_third_elevation_kc, DROP COLUMN IF EXISTS spbook_third_beyond_birth_death, DROP COLUMN IF EXISTS spbook_third_krishna_reservoir,
    DROP COLUMN IF EXISTS spbook_fourth_ssr_6_8, DROP COLUMN IF EXISTS spbook_fourth_laws_of_nature, DROP COLUMN IF EXISTS spbook_fourth_dharma, DROP COLUMN IF EXISTS spbook_fourth_second_chance, DROP COLUMN IF EXISTS spbook_fourth_isopanishad_1_10, DROP COLUMN IF EXISTS spbook_fourth_queen_kunti_video, DROP COLUMN IF EXISTS spbook_fourth_enlightenment_natural, DROP COLUMN IF EXISTS spbook_fourth_krishna_book_1_21,
    DROP COLUMN IF EXISTS spbook_fifth_life_from_life, DROP COLUMN IF EXISTS spbook_fifth_prahlad_teachings, DROP COLUMN IF EXISTS spbook_fifth_journey_self_discovery, DROP COLUMN IF EXISTS spbook_fifth_queen_kunti_hearing, DROP COLUMN IF EXISTS spbook_fifth_lord_kapila, DROP COLUMN IF EXISTS spbook_fifth_nectar_1_6, DROP COLUMN IF EXISTS spbook_fifth_gita_1_6, DROP COLUMN IF EXISTS spbook_fifth_krishna_book_24_28,
    DROP COLUMN IF EXISTS spbook_sixth_nectar_7_11, DROP COLUMN IF EXISTS spbook_sixth_path_perfection, DROP COLUMN IF EXISTS spbook_sixth_civilisation_transcendence, DROP COLUMN IF EXISTS spbook_sixth_hare_krishna_challenge, DROP COLUMN IF EXISTS spbook_sixth_gita_7_12, DROP COLUMN IF EXISTS spbook_sixth_sb_1st_canto_1_6, DROP COLUMN IF EXISTS spbook_sixth_krishna_book_35_59,
    DROP COLUMN IF EXISTS spbook_seventh_gita_13_18, DROP COLUMN IF EXISTS spbook_seventh_sb_1st_canto_7_13, DROP COLUMN IF EXISTS spbook_seventh_krishna_book_63_78,
    DROP COLUMN IF EXISTS spbook_eighth_sb_1st_canto_14_19, DROP COLUMN IF EXISTS spbook_eighth_krishna_book_78_89;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
