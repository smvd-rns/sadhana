-- 012_update_ashram_check_constraint.sql
-- Update users_ashram_check to include 'Staying Single (Not planing to Marry)' and other values

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ashram_check;

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
