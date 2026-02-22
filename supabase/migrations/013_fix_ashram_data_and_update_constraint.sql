-- 013_fix_ashram_data_and_update_constraint.sql
-- Fix invalid ashram data and update check constraint

-- 1. Update invalid values to 'Not decided' (SAFE FALLBACK)
UPDATE users 
SET ashram = 'Not decided' 
WHERE ashram NOT IN (
    'Student', 
    'Not decided', 
    'Gauranga Sabha', 
    'Nityananda Sabha', 
    'Brahmachari', 
    'Grihastha', 
    'Staying Single (Not planing to Marry)'
) 
AND ashram IS NOT NULL;

-- 2. Clean up previous constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ashram_check;

-- 3. Add the new constraint
ALTER TABLE users ADD CONSTRAINT users_ashram_check CHECK (
  ashram IN (
    'Student', 
    'Not decided', 
    'Gauranga Sabha', 
    'Nityananda Sabha', 
    'Brahmachari', 
    'Grihastha', 
    'Staying Single (Not planing to Marry)'
  )
);

-- Reload schema
NOTIFY pgrst, 'reload schema';
