-- Update the status check constraint to include 'understood'
-- Use this script in the Supabase SQL Editor for your SADHANA database

-- 1. Identify and drop the existing constraint
-- Postgres usually names inline constraints like 'event_responses_status_check'
ALTER TABLE event_responses 
DROP CONSTRAINT IF EXISTS event_responses_status_check;

-- 2. Add the updated constraint that includes 'understood'
ALTER TABLE event_responses 
ADD CONSTRAINT event_responses_status_check 
CHECK (status IN ('seen', 'coming', 'not_coming', 'understood'));

-- 3. Verify it works by checking the table definition
-- COMMENT: You can now submit 'understood' responses without error 23514.
