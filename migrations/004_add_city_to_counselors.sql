-- Migration: Add city column to counselors table
-- This migration adds a city field to counselors for better organization and privacy
-- City is a required (NOT NULL) field

-- Step 1: Add city column to counselors table (nullable first)
ALTER TABLE counselors 
ADD COLUMN IF NOT EXISTS city TEXT;

-- Step 2: Update existing rows to have a default city if null
-- IMPORTANT: Uncomment and customize the default city value if you have existing counselors
-- You may want to update them manually with actual city names before making it NOT NULL
UPDATE counselors SET city = 'Unknown' WHERE city IS NULL;

-- Step 3: Now make it NOT NULL (this will fail if any rows still have NULL city)
ALTER TABLE counselors 
ALTER COLUMN city SET NOT NULL;

-- Step 4: Create index for city column
CREATE INDEX IF NOT EXISTS idx_counselors_city ON counselors(city);
