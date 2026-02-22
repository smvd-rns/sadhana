-- 020_update_counselors_ashram_check.sql
-- Update counselors ashram check constraint to match users table
-- Includes both new values from users table and legacy values from counselors table

-- 1. Drop the existing constraint
ALTER TABLE counselors DROP CONSTRAINT IF EXISTS counselors_ashram_check;

-- 2. Add the new constraint with expanded values
ALTER TABLE counselors ADD CONSTRAINT counselors_ashram_check CHECK (
  ashram IN (
    -- Values from users table (Migration 013)
    'Student',
    'Not decided',
    'Gauranga Sabha',
    'Nityananda Sabha',
    'Brahmachari',
    'Grihastha',
    'Staying Single (Not planing to Marry)',
    
    -- Legacy values (to ensure existing counselors data remains valid)
    'Brahmachari Ashram',
    'Grihastha Ashram'
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
