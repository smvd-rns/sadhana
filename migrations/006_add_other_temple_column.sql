-- Migration to add other_temple column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS other_temple TEXT;
