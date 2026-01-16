-- Migration: Add camp completion columns to users table
-- This migration adds boolean columns for tracking camp completions

-- Add camp completion columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS camp_dys BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_sankalpa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_sphurti BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_utkarsh BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_faith_and_doubt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_srcgd_workshop BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_nistha BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS camp_ashray BOOLEAN DEFAULT FALSE;

-- Create indexes for camp columns (optional, for filtering users by camp completion)
CREATE INDEX IF NOT EXISTS idx_users_camp_dys ON users(camp_dys) WHERE camp_dys = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_sankalpa ON users(camp_sankalpa) WHERE camp_sankalpa = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_sphurti ON users(camp_sphurti) WHERE camp_sphurti = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_utkarsh ON users(camp_utkarsh) WHERE camp_utkarsh = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_faith_and_doubt ON users(camp_faith_and_doubt) WHERE camp_faith_and_doubt = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_srcgd_workshop ON users(camp_srcgd_workshop) WHERE camp_srcgd_workshop = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_nistha ON users(camp_nistha) WHERE camp_nistha = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_camp_ashray ON users(camp_ashray) WHERE camp_ashray = TRUE;
