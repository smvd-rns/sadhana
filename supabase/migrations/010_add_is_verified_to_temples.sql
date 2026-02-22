-- 010_add_is_verified_to_temples.sql
-- Add is_verified column to temples table to fix insert error

-- 1. Add is_verified column
ALTER TABLE temples ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Add comment
COMMENT ON COLUMN temples.is_verified IS 'Whether the temple entry has been verified by an admin';

-- 3. Force refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Ensure RLS policies cover the new column
-- (The existing "Allow write access" policy covers ALL columns, so no change needed there, 
-- but re-running the grant ensures everything is clean)
GRANT ALL ON temples TO authenticated;
GRANT ALL ON temples TO service_role;
