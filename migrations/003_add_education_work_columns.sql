-- Migration: Add education and work experience columns to users table
-- This migration adds columns for tracking education and work experience

-- Add education columns (support up to 5 education entries)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS edu_1_institution TEXT,
ADD COLUMN IF NOT EXISTS edu_1_field TEXT,
ADD COLUMN IF NOT EXISTS edu_1_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_2_institution TEXT,
ADD COLUMN IF NOT EXISTS edu_2_field TEXT,
ADD COLUMN IF NOT EXISTS edu_2_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_3_institution TEXT,
ADD COLUMN IF NOT EXISTS edu_3_field TEXT,
ADD COLUMN IF NOT EXISTS edu_3_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_4_institution TEXT,
ADD COLUMN IF NOT EXISTS edu_4_field TEXT,
ADD COLUMN IF NOT EXISTS edu_4_year INTEGER,
ADD COLUMN IF NOT EXISTS edu_5_institution TEXT,
ADD COLUMN IF NOT EXISTS edu_5_field TEXT,
ADD COLUMN IF NOT EXISTS edu_5_year INTEGER;

-- Add work experience columns (support up to 5 work experiences)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS work_1_company TEXT,
ADD COLUMN IF NOT EXISTS work_1_position TEXT,
ADD COLUMN IF NOT EXISTS work_1_start_date DATE,
ADD COLUMN IF NOT EXISTS work_1_end_date DATE,
ADD COLUMN IF NOT EXISTS work_1_current BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS work_2_company TEXT,
ADD COLUMN IF NOT EXISTS work_2_position TEXT,
ADD COLUMN IF NOT EXISTS work_2_start_date DATE,
ADD COLUMN IF NOT EXISTS work_2_end_date DATE,
ADD COLUMN IF NOT EXISTS work_2_current BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS work_3_company TEXT,
ADD COLUMN IF NOT EXISTS work_3_position TEXT,
ADD COLUMN IF NOT EXISTS work_3_start_date DATE,
ADD COLUMN IF NOT EXISTS work_3_end_date DATE,
ADD COLUMN IF NOT EXISTS work_3_current BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS work_4_company TEXT,
ADD COLUMN IF NOT EXISTS work_4_position TEXT,
ADD COLUMN IF NOT EXISTS work_4_start_date DATE,
ADD COLUMN IF NOT EXISTS work_4_end_date DATE,
ADD COLUMN IF NOT EXISTS work_4_current BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS work_5_company TEXT,
ADD COLUMN IF NOT EXISTS work_5_position TEXT,
ADD COLUMN IF NOT EXISTS work_5_start_date DATE,
ADD COLUMN IF NOT EXISTS work_5_end_date DATE,
ADD COLUMN IF NOT EXISTS work_5_current BOOLEAN DEFAULT FALSE;

-- Create indexes for filtering by education/work (optional)
CREATE INDEX IF NOT EXISTS idx_users_edu_institution ON users(edu_1_institution) WHERE edu_1_institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_work_company ON users(work_1_company) WHERE work_1_company IS NOT NULL;
