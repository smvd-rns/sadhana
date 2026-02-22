-- 023_assignment_based_rls.sql
-- Revised: Shift administrative access control from profile-metadata to explicit temple assignments
-- This version uses SECURITY DEFINER functions to avoid infinite recursion on the users table.

-- 1. Helper Functions (SECURITY DEFINER to bypass RLS during checks)

-- Check if current user is Super Admin (Role 8)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 8 = ANY(role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user has any admin role (8, 11, 12, 13)
CREATE OR REPLACE FUNCTION public.is_temple_admin_any()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (role && ARRAY[8, 11, 12, 13])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get names of temples assigned to the current user
CREATE OR REPLACE FUNCTION public.get_assigned_temple_names()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT name FROM public.temples
    WHERE managing_director_id = auth.uid()
       OR director_id = auth.uid()
       OR central_voice_manager_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update users table policies
-- Drop existing restrictive/generic policies
DROP POLICY IF EXISTS "Admins can update users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can insert users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can delete users" ON "public"."users";
DROP POLICY IF EXISTS "Users can view own data" ON "public"."users";
DROP POLICY IF EXISTS "Users can select own data" ON "public"."users";
DROP POLICY IF EXISTS "Users can update own data" ON "public"."users";
DROP POLICY IF EXISTS "Allow public read access" ON "public"."users";
DROP POLICY IF EXISTS "Super Admins have full access" ON "public"."users";
DROP POLICY IF EXISTS "MDs and Directors can manage assigned temple users" ON "public"."users";
DROP POLICY IF EXISTS "Super Admins access" ON "public"."users";
DROP POLICY IF EXISTS "Temple Admins access assigned users" ON "public"."users";

-- Define NEW policies

-- Everyone can see themselves
CREATE POLICY "Users can select own data" ON "public"."users"
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON "public"."users"
FOR UPDATE USING (auth.uid() = id);

-- Super Admins (Role 8) have full access
CREATE POLICY "Super Admins access" ON "public"."users"
FOR ALL USING (public.is_super_admin());

-- Assignment-based access for MDs/Dirs (11, 12, 13)
CREATE POLICY "Temple Admins access assigned users" ON "public"."users"
FOR ALL USING (
  current_temple = ANY(public.get_assigned_temple_names())
  AND public.is_temple_admin_any()
);

-- Note: We should probably keep a generic "authenticated read access" if the app expects users to see each other
-- but for now we follow the user's request for strict assignment-based access.


-- 3. Update centers table policies
DROP POLICY IF EXISTS "Allow authenticated write access" ON centers;
DROP POLICY IF EXISTS "Allow public read access" ON centers;
DROP POLICY IF EXISTS "Super Admins can manage all centers" ON centers;
DROP POLICY IF EXISTS "MDs and Directors can manage assigned temple centers" ON centers;

-- Everyone can read centers (needed for registration form dropdowns)
CREATE POLICY "Public centers read" ON centers
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin centers manage" ON centers
FOR ALL TO authenticated USING (
  public.is_super_admin() OR 
  (temple_name = ANY(public.get_assigned_temple_names()) AND public.is_temple_admin_any())
);


-- 4. Update temples table policies
DROP POLICY IF EXISTS "Allow public read access" ON temples;
DROP POLICY IF EXISTS "Allow write access to authenticated users" ON temples;
DROP POLICY IF EXISTS "Super Admins can manage all temples" ON temples;
DROP POLICY IF EXISTS "Assignees can update their assigned temples" ON temples;

-- Everyone can read temples (needed for registration form)
CREATE POLICY "Public temples read" ON temples
FOR SELECT TO authenticated USING (true);

-- Manage temples
CREATE POLICY "Admin temples update" ON temples
FOR ALL TO authenticated USING (
  public.is_super_admin() OR 
  (name = ANY(public.get_assigned_temple_names()) AND public.is_temple_admin_any())
);
