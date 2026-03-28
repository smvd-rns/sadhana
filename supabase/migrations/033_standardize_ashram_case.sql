-- 033_standardize_ashram_case.sql
-- Standardize "Staying Single (Not planning to marry)" spelling (lowercase 'm')

-- 1. Drop existing constraints first so we can update the data
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ashram_check;
ALTER TABLE counselors DROP CONSTRAINT IF EXISTS counselors_ashram_check;

-- 2. Update existing data in users table (main column)
UPDATE users 
SET ashram = 'Staying Single (Not planning to marry)' 
WHERE ashram = 'Staying Single (Not planning to Marry)';

-- 3. Update existing data in hierarchy JSONB column in users table
UPDATE users 
SET hierarchy = jsonb_set(hierarchy, '{ashram}', '"Staying Single (Not planning to marry)"')
WHERE (hierarchy->>'ashram') = 'Staying Single (Not planning to Marry)';

-- 4. Update data in profile_update_requests table (JSONB fields)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profile_update_requests') THEN
        UPDATE profile_update_requests
        SET requested_changes = requested_changes || jsonb_build_object('ashram', 'Staying Single (Not planning to marry)')
        WHERE (requested_changes->>'ashram') = 'Staying Single (Not planning to Marry)';

        UPDATE profile_update_requests
        SET current_values = current_values || jsonb_build_object('ashram', 'Staying Single (Not planning to marry)')
        WHERE (current_values->>'ashram') = 'Staying Single (Not planning to Marry)';
    END IF;
END $$;

-- 5. Update existing data in counselors table
UPDATE counselors 
SET ashram = 'Staying Single (Not planning to marry)' 
WHERE ashram = 'Staying Single (Not planning to Marry)';

-- 6. Re-add users ashram check constraint with correct spelling
ALTER TABLE users ADD CONSTRAINT users_ashram_check CHECK (
  ashram IN (
    'Student', 
    'Not decided', 
    'Gauranga Sabha', 
    'Nityananda Sabha', 
    'Brahmachari', 
    'Grihastha', 
    'Staying Single (Not planning to marry)'
  )
);

-- 7. Re-add counselors ashram check constraint with expanded values
ALTER TABLE counselors ADD CONSTRAINT counselors_ashram_check CHECK (
  ashram IN (
    'Student',
    'Not decided',
    'Gauranga Sabha',
    'Nityananda Sabha',
    'Brahmachari',
    'Grihastha',
    'Staying Single (Not planning to marry)',
    'Brahmachari Ashram',
    'Grihastha Ashram'
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
