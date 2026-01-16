-- Migration: Add SP Books Study Course columns to users table
-- This migration adds boolean columns for tracking SP book study course completion

-- Third Semester (3.5 hours study per week)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spbook_third_ssr_1_5 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_coming_back BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_pqpa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_matchless_gift BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_raja_vidya BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_elevation_kc BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_beyond_birth_death BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_third_krishna_reservoir BOOLEAN DEFAULT FALSE;

-- Fourth Semester (4 hours study per week)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spbook_fourth_ssr_6_8 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_laws_of_nature BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_dharma BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_second_chance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_isopanishad_1_10 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_queen_kunti_video BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_enlightenment_natural BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fourth_krishna_book_1_21 BOOLEAN DEFAULT FALSE;

-- Fifth Semester (4.5 hours study per week)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spbook_fifth_life_from_life BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_prahlad_teachings BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_journey_self_discovery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_queen_kunti_hearing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_lord_kapila BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_nectar_1_6 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_gita_1_6 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_fifth_krishna_book_24_28 BOOLEAN DEFAULT FALSE;

-- Sixth Semester (5 hours study per week)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spbook_sixth_nectar_7_11 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_sixth_path_perfection BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_sixth_civilisation_transcendence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_sixth_hare_krishna_challenge BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_sixth_gita_7_12 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_sixth_sb_1st_canto_1_6 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_sixth_krishna_book_35_59 BOOLEAN DEFAULT FALSE;

-- Seventh Semester (5 hours study per week)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spbook_seventh_gita_13_18 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_seventh_sb_1st_canto_7_13 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_seventh_krishna_book_63_78 BOOLEAN DEFAULT FALSE;

-- Eighth Semester (5 hours study per week)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS spbook_eighth_sb_1st_canto_14_19 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spbook_eighth_krishna_book_78_89 BOOLEAN DEFAULT FALSE;

-- Create indexes for SP book columns (optional, for faster queries if needed)
-- CREATE INDEX IF NOT EXISTS idx_users_spbook_third ON users(spbook_third_ssr_1_5, spbook_third_coming_back, spbook_third_pqpa);
-- CREATE INDEX IF NOT EXISTS idx_users_spbook_fourth ON users(spbook_fourth_ssr_6_8, spbook_fourth_laws_of_nature);
-- (Additional indexes can be added if querying by semester becomes common)
