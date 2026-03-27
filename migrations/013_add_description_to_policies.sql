-- Migration: Add description column to policies table
ALTER TABLE policies ADD COLUMN IF NOT EXISTS description TEXT;
