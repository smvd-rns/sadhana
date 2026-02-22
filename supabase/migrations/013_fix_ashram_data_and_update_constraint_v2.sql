-- 013_fix_ashram_data_and_update_constraint_v2.sql
-- Fix invalid ashram data and update check constraint
-- Order: DROP -> UPDATE -> ADD (to avoid constraint violation during update)

-- 1. Clean up constraint FIRST
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ashram_check;

-- 2. Update invalid values to 'Not decided' (SAFE FALLBACK)
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
