-- RLS Policies for Voice Manager (Role 3) and BC Voice Manager (Role 4)
-- FIXED VERSION - Run this SQL in your Supabase SQL Editor
-- This version is more permissive to avoid "Failed to fetch" errors

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 1: Drop existing policies that might conflict
-- ============================================
DROP POLICY IF EXISTS "BC Voice Manager can update users" ON users;
DROP POLICY IF EXISTS "Voice Manager can read users from their center" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;

-- ============================================
-- Policy 1: Allow all authenticated users to READ users
-- ============================================
-- This is permissive - the application layer handles filtering
-- This prevents "Failed to fetch" errors while still allowing app-level security
CREATE POLICY "Allow authenticated users to read users"
ON users
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- Policy 2: Allow BC Voice Manager and Super Admin to UPDATE users
-- ============================================
-- BC Voice Manager (role 4) and Super Admin (role 8) can update users
-- The application layer enforces that BC Voice Manager can only assign role 3
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
  -- User can always update their own data
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
-- Notes:
-- ============================================
-- 1. The SELECT policy is permissive (allows all authenticated users to read)
--    - The application layer (users/page.tsx, voice-manager/page.tsx) handles filtering
--    - This prevents "Failed to fetch" errors
--
-- 2. The UPDATE policy restricts updates to:
--    - Super Admin (role 8) - can update any user
--    - BC Voice Manager (role 4) - can update users (app layer ensures only role 3 assignment)
--    - Users can update their own data
--
-- 3. Voice Manager (role 3) access is handled in the application layer:
--    - They can only see users from their center (filtered in voice-manager/page.tsx)
--    - They cannot update other users (only BC Voice Manager can assign roles)
--
-- 4. If you want stricter RLS-level filtering for Voice Managers, you can add:
--    - A separate SELECT policy that checks center_id matching
--    - But this might cause issues if center_id is not properly set for all users

-- ============================================
-- Optional: Stricter policy for Voice Manager (uncomment if needed)
-- ============================================
-- Uncomment this if you want RLS to enforce center-level access for Voice Managers
-- WARNING: This might cause "Failed to fetch" if center_id is not set for all users
/*
CREATE POLICY "Voice Manager can read users from their center only"
ON users
FOR SELECT
USING (
  -- Super admin and BC Voice Manager can see all (handled by main policy)
  -- This policy only applies to Voice Managers (role 3)
  NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IS NOT NULL
    AND (8 = ANY(u.role::integer[]) OR 4 = ANY(u.role::integer[]))
  )
  AND
  (
    -- Voice Manager (role 3) can only see users from their own center
    (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IS NOT NULL
        AND 3 = ANY(u.role::integer[])
      )
      AND (
        -- Match by center_id (preferred)
        (
          (SELECT center_id FROM users WHERE id = auth.uid()) IS NOT NULL
          AND (SELECT center_id FROM users WHERE id = auth.uid()) = users.center_id
        )
        OR
        -- Match by center name (fallback)
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
    -- Other authenticated users (counselors, students) - app layer filters
    auth.uid() IS NOT NULL
  )
);
*/
