-- 042_add_aadhar_card_image.sql
-- Add aadhar_card_image column to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS aadhar_card_image TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
