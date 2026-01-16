-- ISKCON Sadhana Platform - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role INTEGER[] DEFAULT ARRAY[1], -- Array of role numbers (1-8), default is 1 (student)
  phone TEXT,
  profile_image TEXT, -- Google Drive photo link
  spiritual_level TEXT CHECK (spiritual_level IN ('beginner', 'intermediate', 'advanced')),
  -- Separate columns for hierarchy (easier for data segregation and queries)
  state TEXT,
  city TEXT,
  center TEXT,
  -- Spiritual information columns
  initiation_status TEXT CHECK (initiation_status IN ('initiated', 'aspiring')),
  initiated_name TEXT,
  spiritual_master_name TEXT,
  aspiring_spiritual_master_name TEXT,
  chanting_since DATE,
  rounds INTEGER,
  ashram TEXT CHECK (ashram IN ('Gauranga Sabha', 'Nityananda Sabha', 'Grihastha Ashram', 'Brahmachari Ashram', 'Not Decided')),
  royal_member TEXT CHECK (royal_member IN ('yes', 'no')),
  brahmachari_counselor TEXT,
  grihastha_counselor TEXT,
  -- Camp completion columns (true/false for each camp)
  camp_dys BOOLEAN DEFAULT FALSE,
  camp_sankalpa BOOLEAN DEFAULT FALSE,
  camp_sphurti BOOLEAN DEFAULT FALSE,
  camp_utkarsh BOOLEAN DEFAULT FALSE,
  camp_faith_and_doubt BOOLEAN DEFAULT FALSE,
  camp_srcgd_workshop BOOLEAN DEFAULT FALSE,
  camp_nistha BOOLEAN DEFAULT FALSE,
  camp_ashray BOOLEAN DEFAULT FALSE,
  -- SP Books Study Course columns (Third Semester - 3.5 hours study per week)
  spbook_third_ssr_1_5 BOOLEAN DEFAULT FALSE,
  spbook_third_coming_back BOOLEAN DEFAULT FALSE,
  spbook_third_pqpa BOOLEAN DEFAULT FALSE,
  spbook_third_matchless_gift BOOLEAN DEFAULT FALSE,
  spbook_third_raja_vidya BOOLEAN DEFAULT FALSE,
  spbook_third_elevation_kc BOOLEAN DEFAULT FALSE,
  spbook_third_beyond_birth_death BOOLEAN DEFAULT FALSE,
  spbook_third_krishna_reservoir BOOLEAN DEFAULT FALSE,
  -- SP Books Study Course columns (Fourth Semester - 4 hours study per week)
  spbook_fourth_ssr_6_8 BOOLEAN DEFAULT FALSE,
  spbook_fourth_laws_of_nature BOOLEAN DEFAULT FALSE,
  spbook_fourth_dharma BOOLEAN DEFAULT FALSE,
  spbook_fourth_second_chance BOOLEAN DEFAULT FALSE,
  spbook_fourth_isopanishad_1_10 BOOLEAN DEFAULT FALSE,
  spbook_fourth_queen_kunti_video BOOLEAN DEFAULT FALSE,
  spbook_fourth_enlightenment_natural BOOLEAN DEFAULT FALSE,
  spbook_fourth_krishna_book_1_21 BOOLEAN DEFAULT FALSE,
  -- SP Books Study Course columns (Fifth Semester - 4.5 hours study per week)
  spbook_fifth_life_from_life BOOLEAN DEFAULT FALSE,
  spbook_fifth_prahlad_teachings BOOLEAN DEFAULT FALSE,
  spbook_fifth_journey_self_discovery BOOLEAN DEFAULT FALSE,
  spbook_fifth_queen_kunti_hearing BOOLEAN DEFAULT FALSE,
  spbook_fifth_lord_kapila BOOLEAN DEFAULT FALSE,
  spbook_fifth_nectar_1_6 BOOLEAN DEFAULT FALSE,
  spbook_fifth_gita_1_6 BOOLEAN DEFAULT FALSE,
  spbook_fifth_krishna_book_24_28 BOOLEAN DEFAULT FALSE,
  -- SP Books Study Course columns (Sixth Semester - 5 hours study per week)
  spbook_sixth_nectar_7_11 BOOLEAN DEFAULT FALSE,
  spbook_sixth_path_perfection BOOLEAN DEFAULT FALSE,
  spbook_sixth_civilisation_transcendence BOOLEAN DEFAULT FALSE,
  spbook_sixth_hare_krishna_challenge BOOLEAN DEFAULT FALSE,
  spbook_sixth_gita_7_12 BOOLEAN DEFAULT FALSE,
  spbook_sixth_sb_1st_canto_1_6 BOOLEAN DEFAULT FALSE,
  spbook_sixth_krishna_book_35_59 BOOLEAN DEFAULT FALSE,
  -- SP Books Study Course columns (Seventh Semester - 5 hours study per week)
  spbook_seventh_gita_13_18 BOOLEAN DEFAULT FALSE,
  spbook_seventh_sb_1st_canto_7_13 BOOLEAN DEFAULT FALSE,
  spbook_seventh_krishna_book_63_78 BOOLEAN DEFAULT FALSE,
  -- SP Books Study Course columns (Eighth Semester - 5 hours study per week)
  spbook_eighth_sb_1st_canto_14_19 BOOLEAN DEFAULT FALSE,
  spbook_eighth_krishna_book_78_89 BOOLEAN DEFAULT FALSE,
  -- Education columns (support up to 5 education entries)
  edu_1_institution TEXT,
  edu_1_field TEXT,
  edu_1_year INTEGER,
  edu_2_institution TEXT,
  edu_2_field TEXT,
  edu_2_year INTEGER,
  edu_3_institution TEXT,
  edu_3_field TEXT,
  edu_3_year INTEGER,
  edu_4_institution TEXT,
  edu_4_field TEXT,
  edu_4_year INTEGER,
  edu_5_institution TEXT,
  edu_5_field TEXT,
  edu_5_year INTEGER,
  -- Work experience columns (support up to 5 work experiences)
  work_1_company TEXT,
  work_1_position TEXT,
  work_1_start_date DATE,
  work_1_end_date DATE,
  work_1_current BOOLEAN DEFAULT FALSE,
  work_2_company TEXT,
  work_2_position TEXT,
  work_2_start_date DATE,
  work_2_end_date DATE,
  work_2_current BOOLEAN DEFAULT FALSE,
  work_3_company TEXT,
  work_3_position TEXT,
  work_3_start_date DATE,
  work_3_end_date DATE,
  work_3_current BOOLEAN DEFAULT FALSE,
  work_4_company TEXT,
  work_4_position TEXT,
  work_4_start_date DATE,
  work_4_end_date DATE,
  work_4_current BOOLEAN DEFAULT FALSE,
  work_5_company TEXT,
  work_5_position TEXT,
  work_5_start_date DATE,
  work_5_end_date DATE,
  work_5_current BOOLEAN DEFAULT FALSE,
  -- Language columns (support up to 5 languages)
  language_1 TEXT,
  language_2 TEXT,
  language_3 TEXT,
  language_4 TEXT,
  language_5 TEXT,
  -- Skills columns (support up to 5 skills)
  skill_1 TEXT,
  skill_2 TEXT,
  skill_3 TEXT,
  skill_4 TEXT,
  skill_5 TEXT,
  -- Services rendered columns (support up to 5 services)
  service_1 TEXT,
  service_2 TEXT,
  service_3 TEXT,
  service_4 TEXT,
  service_5 TEXT,
  -- Keep hierarchy JSONB for backward compatibility (can be removed later)
  hierarchy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Create index on role array for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users USING GIN(role);
-- Create indexes on hierarchy columns (separate columns for better performance)
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_center ON users(center);
-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_state_city ON users(state, city);
CREATE INDEX IF NOT EXISTS idx_users_state_city_center ON users(state, city, center);
-- Create indexes for spiritual information columns
CREATE INDEX IF NOT EXISTS idx_users_ashram ON users(ashram);
CREATE INDEX IF NOT EXISTS idx_users_brahmachari_counselor ON users(brahmachari_counselor);
CREATE INDEX IF NOT EXISTS idx_users_grihastha_counselor ON users(grihastha_counselor);
-- Create indexes for education and work experience (for filtering and searching)
CREATE INDEX IF NOT EXISTS idx_users_edu_institution ON users(edu_1_institution) WHERE edu_1_institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_work_company ON users(work_1_company) WHERE work_1_company IS NOT NULL;
-- Keep hierarchy JSONB indexes for backward compatibility
CREATE INDEX IF NOT EXISTS idx_users_hierarchy_state ON users((hierarchy->>'state'));
CREATE INDEX IF NOT EXISTS idx_users_hierarchy_city ON users((hierarchy->>'city'));
CREATE INDEX IF NOT EXISTS idx_users_hierarchy_center ON users((hierarchy->>'center'));

-- Sadhana Reports table
CREATE TABLE IF NOT EXISTS sadhana_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  japa INTEGER DEFAULT 0,
  hearing INTEGER DEFAULT 0,
  reading INTEGER DEFAULT 0,
  book_name TEXT,
  to_bed INTEGER DEFAULT 0,
  wake_up INTEGER DEFAULT 0,
  daily_filling INTEGER DEFAULT 0,
  day_sleep INTEGER DEFAULT 0,
  body_percent NUMERIC(5,2) DEFAULT 0,
  soul_percent NUMERIC(5,2) DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date) -- One report per user per date
);

-- Create indexes for sadhana_reports
CREATE INDEX IF NOT EXISTS idx_sadhana_reports_user_id ON sadhana_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sadhana_reports_date ON sadhana_reports(date);
CREATE INDEX IF NOT EXISTS idx_sadhana_reports_user_date ON sadhana_reports(user_id, date);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_ids UUID[] DEFAULT ARRAY[]::UUID[],
  recipient_groups TEXT[] DEFAULT ARRAY[]::TEXT[],
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  read_by UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_ids ON messages USING GIN(recipient_ids);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_groups ON messages USING GIN(recipient_groups);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist (for idempotency - allows re-running the script)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_sadhana_reports_updated_at ON sadhana_reports;

-- Trigger to auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on sadhana_reports table
CREATE TRIGGER update_sadhana_reports_updated_at
  BEFORE UPDATE ON sadhana_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sadhana_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Authenticated users can insert" ON users;

-- RLS Policies for users table
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read other users (for admin purposes, we'll handle this in application logic)
CREATE POLICY "Users can read all users" ON users
  FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their own record (for registration and OAuth)
-- This allows users to create their own user record when they sign up or sign in with OAuth
CREATE POLICY "Authenticated users can insert" ON users
  FOR INSERT WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own reports" ON sadhana_reports;
DROP POLICY IF EXISTS "Users can read all reports" ON sadhana_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON sadhana_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON sadhana_reports;

-- RLS Policies for sadhana_reports table
-- Users can read their own reports
CREATE POLICY "Users can read own reports" ON sadhana_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read all reports (for admin purposes)
CREATE POLICY "Users can read all reports" ON sadhana_reports
  FOR SELECT USING (true);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports" ON sadhana_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON sadhana_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- RLS Policies for messages table
-- Users can read messages where they are sender or recipient
CREATE POLICY "Users can read own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = ANY(recipient_ids) OR
    auth.uid()::text = ANY(recipient_groups)
  );

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they sent (mark as read)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = ANY(recipient_ids));

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state, name) -- One city per state with same name
);

-- Create indexes for cities
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_state_name ON cities(state, name);

-- Centers table
CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state, city, name) -- One center per city with same name
);

-- Create indexes for centers
CREATE INDEX IF NOT EXISTS idx_centers_state ON centers(state);
CREATE INDEX IF NOT EXISTS idx_centers_city ON centers(city);
CREATE INDEX IF NOT EXISTS idx_centers_state_city ON centers(state, city);

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_cities_updated_at ON cities;
DROP TRIGGER IF EXISTS update_centers_updated_at ON centers;

-- Trigger to auto-update updated_at on cities table
CREATE TRIGGER update_cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on centers table
CREATE TRIGGER update_centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for cities and centers
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read cities" ON cities;
DROP POLICY IF EXISTS "Authenticated users can insert cities" ON cities;

-- RLS Policies for cities table
-- Everyone can read cities (for registration and dropdowns)
CREATE POLICY "Anyone can read cities" ON cities
  FOR SELECT USING (true);

-- Any authenticated user can insert cities (for registration and new users)
CREATE POLICY "Authenticated users can insert cities" ON cities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update/delete cities (handled via service role key or additional policies)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can insert centers" ON centers;

-- RLS Policies for centers table
-- Everyone can read centers (for registration and dropdowns)
CREATE POLICY "Anyone can read centers" ON centers
  FOR SELECT USING (true);

-- Any authenticated user can insert centers (for registration and new users)
CREATE POLICY "Authenticated users can insert centers" ON centers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update/delete centers (handled via service role key or additional policies)

-- Counselors table
CREATE TABLE IF NOT EXISTS counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  ashram TEXT CHECK (ashram IN ('Brahmachari Ashram', 'Grihastha Ashram')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email) -- One counselor per email
);

-- Create indexes for counselors
CREATE INDEX IF NOT EXISTS idx_counselors_name ON counselors(name);
CREATE INDEX IF NOT EXISTS idx_counselors_email ON counselors(email);
CREATE INDEX IF NOT EXISTS idx_counselors_mobile ON counselors(mobile);
CREATE INDEX IF NOT EXISTS idx_counselors_city ON counselors(city);
CREATE INDEX IF NOT EXISTS idx_counselors_ashram ON counselors(ashram);

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_counselors_updated_at ON counselors;

-- Trigger to auto-update updated_at on counselors table
CREATE TRIGGER update_counselors_updated_at
  BEFORE UPDATE ON counselors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for counselors
ALTER TABLE counselors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read counselors" ON counselors;
DROP POLICY IF EXISTS "Authenticated users can insert counselors" ON counselors;

-- RLS Policies for counselors table
-- Everyone can read counselors (for registration and dropdowns)
CREATE POLICY "Anyone can read counselors" ON counselors
  FOR SELECT USING (true);

-- Any authenticated user can insert counselors (for registration and new users)
CREATE POLICY "Authenticated users can insert counselors" ON counselors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update/delete counselors (handled via service role key or additional policies)

-- Note: For admin operations, you'll use the service role key which bypasses RLS
-- Or create additional policies for admin roles

-- Migration: Replace spiritual_level with birth_date
-- Run this after creating the table to update existing installations
ALTER TABLE users DROP COLUMN IF EXISTS spiritual_level;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
