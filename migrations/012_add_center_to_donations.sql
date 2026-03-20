-- Run this in your SECONDARY (Sadhana) Supabase SQL Editor

-- 1. Add center column (skip if already done)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS center TEXT;
CREATE INDEX IF NOT EXISTS idx_donations_center ON donations(center);

-- 2. Enable RLS (skip if already enabled)
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- 3. Allow users to read ONLY THEIR OWN tagged donations
CREATE POLICY "Users can read their own tagged donations"
  ON donations
  FOR SELECT
  USING (tag_user_id = auth.uid());

-- 4. Allow service role full access (for admin server actions)
-- This is automatic for service_role key, no policy needed.
