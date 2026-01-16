-- RLS Policies for Counselor Request Updates
-- Run this SQL in your Supabase SQL Editor after running the migration script

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow super admins (role 8) to update counselor request status fields
-- This policy allows users with role 8 (super_admin) to update counselor request related fields
-- Note: This assumes 'role' is stored as integer[] (array of integers)
CREATE POLICY "Allow super admins to update counselor requests"
ON users
FOR UPDATE
USING (
  -- Check if the current authenticated user has super_admin role (8)
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND 8 = ANY(u.role::integer[])
  )
)
WITH CHECK (
  -- Same check for the new row
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND 8 = ANY(u.role::integer[])
  )
);

-- Alternative policy if the above doesn't work (handles different role storage types)
-- Try this if you get type errors with the above policy:
/*
CREATE POLICY "Allow super admins to update counselor requests (alternative)"
ON users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (
      -- Try different ways to check for role 8
      CASE 
        WHEN pg_typeof(role) = 'integer[]'::regtype THEN 8 = ANY(role::integer[])
        WHEN pg_typeof(role) = 'jsonb'::regtype THEN (role::jsonb) @> '8'::jsonb OR (role::jsonb) @> '[8]'::jsonb
        WHEN pg_typeof(role) = 'integer'::regtype THEN role = 8
        ELSE false
      END
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (
      CASE 
        WHEN pg_typeof(role) = 'integer[]'::regtype THEN 8 = ANY(role::integer[])
        WHEN pg_typeof(role) = 'jsonb'::regtype THEN (role::jsonb) @> '8'::jsonb OR (role::jsonb) @> '[8]'::jsonb
        WHEN pg_typeof(role) = 'integer'::regtype THEN role = 8
        ELSE false
      END
    )
  )
);
*/

-- Temporary permissive policy for testing (NOT RECOMMENDED FOR PRODUCTION)
-- Only use this if the above policies don't work and you need to test:
/*
CREATE POLICY "Allow authenticated users to update counselor requests (testing only)"
ON users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- Note: The temporary policy above is very permissive and should only be used for testing.
-- In production, you should restrict it based on your security requirements.
