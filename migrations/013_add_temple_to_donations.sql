-- Add temple column to the donations table
ALTER TABLE donations ADD COLUMN IF NOT EXISTS temple TEXT;
