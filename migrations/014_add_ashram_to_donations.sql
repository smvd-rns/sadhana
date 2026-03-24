-- Add ashram column to the donations table
ALTER TABLE donations ADD COLUMN IF NOT EXISTS ashram TEXT;
CREATE INDEX IF NOT EXISTS idx_donations_ashram ON donations(ashram);
