-- 034_update_ashram_options.sql
-- Update ashram options to 'Student and Not decided' and 'Working and Not Decided'

-- 1. Drop existing constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ashram_check;
ALTER TABLE counselors DROP CONSTRAINT IF EXISTS counselors_ashram_check;

-- 2. Update existing data in users and counselors table
-- Map 'Student' and 'Not decided' to new combined values
UPDATE users SET ashram = 'Student and Not decided' WHERE ashram IN ('Student', 'Student and not decided');
UPDATE users SET ashram = 'Working and Not Decided' WHERE ashram IN ('Not decided', 'Working and not decided');

UPDATE counselors SET ashram = 'Student and Not decided' WHERE ashram IN ('Student', 'Student and not decided');
UPDATE counselors SET ashram = 'Working and Not Decided' WHERE ashram IN ('Not decided', 'Working and not decided');

-- 3. Re-add users ashram check constraint
ALTER TABLE users ADD CONSTRAINT users_ashram_check CHECK (
  ashram IN (
    'Student and Not decided', 
    'Working and Not Decided', 
    'Gauranga Sabha', 
    'Nityananda Sabha', 
    'Brahmachari', 
    'Grihastha', 
    'Staying Single (Not planning to marry)'
  )
);

-- 4. Re-add counselors ashram check constraint
ALTER TABLE counselors ADD CONSTRAINT counselors_ashram_check CHECK (
  ashram IN (
    'Student and Not decided',
    'Working and Not Decided',
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
