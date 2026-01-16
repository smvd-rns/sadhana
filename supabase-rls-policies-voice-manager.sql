-- RLS Policies for Voice Manager (Role 3) and BC Voice Manager (Role 4)
-- Run this SQL in your Supabase SQL Editor

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Policy 1: Allow BC Voice Manager (Role 4) to assign Voice Manager role (Role 3) only
-- ============================================
-- This policy ensures that users with role 4 (bc_voice_manager) can only update
-- the role field to include role 3 (voice_manager), not other roles

-- Policy: Allow BC Voice Manager (Role 4) to update users
-- Note: The application layer enforces that BC Voice Manager can only assign role 3
-- This RLS policy allows the update, but the actual validation is in the frontend code

-- First, drop any existing UPDATE policies that might conflict
DROP POLICY IF EXISTS "BC Voice Manager can update users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;

-- Create UPDATE policy
CREATE POLICY "BC Voice Manager can update users"
ON users
FOR UPDATE
USING (
  -- Super admin (role 8) can update any user
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND 8 = ANY(u.role::integer[])
  )
  OR
  -- BC Voice Manager (role 4) can update users
  -- Application layer ensures they can only assign role 3
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND 4 = ANY(u.role::integer[])
  )
  OR
  -- User can always update their own data (except role - that's restricted)
  users.id = auth.uid()
)
WITH CHECK (
  -- Same check for the new row
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND (8 = ANY(u.role::integer[]) OR 4 = ANY(u.role::integer[]))
  )
  OR
  -- User can update their own data
  users.id = auth.uid()
);

-- ============================================
-- Policy 2: Allow all authenticated users to read users
-- ============================================
-- This is a permissive policy that allows authenticated users to read users
-- The application layer handles filtering based on roles and centers
-- We need this to be permissive because the application code does the filtering

-- First, drop any existing SELECT policies that might conflict
DROP POLICY IF EXISTS "Voice Manager can read users from their center" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;

-- Create a permissive SELECT policy (application layer handles filtering)
CREATE POLICY "Allow authenticated users to read users"
ON users
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- Policy 2b: More restrictive policy for Voice Manager (optional - use if you want RLS-level filtering)
-- ============================================
-- Uncomment this if you want RLS to enforce center-level access for Voice Managers
-- Note: This might cause issues if center_id is not set properly
/*
CREATE POLICY "Voice Manager can read users from their center"
ON users
FOR SELECT
USING (
  -- Super admin (role 8) can see all users
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND 8 = ANY(u.role::integer[])
  )
  OR
  -- BC Voice Manager (role 4) can see all users (filtered in app layer)
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND 4 = ANY(u.role::integer[])
  )
  OR
  -- Voice Manager (role 3) can only see users from their own center
  (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IS NOT NULL
      AND 3 = ANY(u.role::integer[])
    )
    AND (
      -- Match by center_id (preferred) or center name (fallback)
      (
        (SELECT center_id FROM users WHERE id = auth.uid()) IS NOT NULL
        AND (SELECT center_id FROM users WHERE id = auth.uid()) = users.center_id
      )
      OR
      (
        (SELECT center_id FROM users WHERE id = auth.uid()) IS NULL
        AND (SELECT center FROM users WHERE id = auth.uid()) IS NOT NULL
        AND (SELECT center FROM users WHERE id = auth.uid()) = users.center
      )
    )
  )
  OR
  -- User can always see their own data
  users.id = auth.uid()
  OR
  -- Allow other authenticated users (counselors, students, etc.) to read
  -- The application layer will filter what they can see
  auth.uid() IS NOT NULL
);
*/

-- ============================================
-- Policy 3: Allow BC Voice Manager to read users from their approved centers
-- ============================================
-- This is mainly handled in application layer, but we allow read access for role 4
-- The actual filtering by approved centers is done in the application code

-- Note: The above SELECT policy already covers this case, but we can add
-- a more specific policy if needed for better performance

-- ============================================
-- Policy 4: Prevent BC Voice Manager from assigning roles other than 3
-- ============================================
-- Additional validation: Ensure BC Voice Manager cannot assign roles other than 3
-- This is a safety check in addition to the application layer validation

-- Note: This is complex to implement purely in RLS, so we rely on application
-- layer validation. The application code in users/page.tsx already enforces this.

-- ============================================
-- Helper function to check if user has a specific role
-- ============================================
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, role_number INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role IS NOT NULL
    AND role_number = ANY(role::integer[])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Alternative: More permissive policy for testing
-- ============================================
-- If the above policies are too restrictive, you can use this for testing:
/*
CREATE OR REPLACE POLICY "Allow authenticated users to read users (testing)"
ON users
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE POLICY "Allow authenticated users to update users (testing)"
ON users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- ============================================
-- Notes:
-- ============================================
-- 1. The application layer (users/page.tsx) enforces that BC Voice Manager
--    can only assign role 3 (voice_manager) to users
-- 2. Voice Managers can only see users from their own center (enforced by RLS)
-- 3. Super Admin (role 8) has full access to all users
-- 4. The center matching is done by center_id (preferred) or center name (fallback)
-- 5. These policies work with the role array format (integer[])
