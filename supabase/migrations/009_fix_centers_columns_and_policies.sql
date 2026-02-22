-- 009_fix_centers_columns_and_policies.sql
-- Comprehensive fix to ensure temple columns exist and are writable

-- 1. Ensure columns exist (idempotent operations)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS temple_id UUID REFERENCES temples(id) ON DELETE SET NULL;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS temple_name TEXT;

-- 2. Add comments
COMMENT ON COLUMN centers.temple_id IS 'Foreign key reference to temples table';
COMMENT ON COLUMN centers.temple_name IS 'Name of the parent temple';

-- 3. Create index if not exists
CREATE INDEX IF NOT EXISTS idx_centers_temple_id ON centers(temple_id);

-- 4. FORCE REFRESH SCHEMA CACHE (by notifying PostgREST)
NOTIFY pgrst, 'reload schema';

-- 5. UPDATE RLS POLICIES
-- First, drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Allow public read access" ON centers;
DROP POLICY IF EXISTS "Allow authenticated insert" ON centers;
DROP POLICY IF EXISTS "Allow authenticated update" ON centers;
DROP POLICY IF EXISTS "Allow authenticated delete" ON centers;
DROP POLICY IF EXISTS "Allow authenticated write access" ON centers;

-- Create comprehensive policies
-- Read: Everyone can read
CREATE POLICY "Allow public read access" ON centers
  FOR SELECT USING (true);

-- Write: Authenticated users can Insert/Update/Delete
-- (In a real app, you might restrict this to admins, but for now we need it to work)
CREATE POLICY "Allow authenticated write access" ON centers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Grant permissions to roles just in case
GRANT ALL ON centers TO authenticated;
GRANT ALL ON centers TO service_role;
