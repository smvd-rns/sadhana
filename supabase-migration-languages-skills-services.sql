-- Migration: Add Languages, Skills, and Services Rendered Fields to Users Table
-- Run this SQL in your Supabase SQL Editor to add the new columns to existing users table

-- Add language columns (support up to 5 languages)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS language_1 TEXT,
ADD COLUMN IF NOT EXISTS language_2 TEXT,
ADD COLUMN IF NOT EXISTS language_3 TEXT,
ADD COLUMN IF NOT EXISTS language_4 TEXT,
ADD COLUMN IF NOT EXISTS language_5 TEXT;

-- Add skills columns (support up to 5 skills)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS skill_1 TEXT,
ADD COLUMN IF NOT EXISTS skill_2 TEXT,
ADD COLUMN IF NOT EXISTS skill_3 TEXT,
ADD COLUMN IF NOT EXISTS skill_4 TEXT,
ADD COLUMN IF NOT EXISTS skill_5 TEXT;

-- Add services rendered columns (support up to 5 services)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS service_1 TEXT,
ADD COLUMN IF NOT EXISTS service_2 TEXT,
ADD COLUMN IF NOT EXISTS service_3 TEXT,
ADD COLUMN IF NOT EXISTS service_4 TEXT,
ADD COLUMN IF NOT EXISTS service_5 TEXT;
