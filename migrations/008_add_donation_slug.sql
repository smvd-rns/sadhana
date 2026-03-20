-- Add donation_slug to users table for personalized donation links
ALTER TABLE users ADD COLUMN IF NOT EXISTS donation_slug TEXT UNIQUE;

-- Create an index for faster lookups on the slug
CREATE INDEX IF NOT EXISTS idx_users_donation_slug ON users(donation_slug);
