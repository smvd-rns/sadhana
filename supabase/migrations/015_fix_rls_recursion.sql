-- Function to check if current user is admin/counselor (Role >= 2)
-- SECURITY DEFINER allows this function to bypass RLS when reading public.users to avoid recursion
CREATE OR REPLACE FUNCTION public.check_admin_access()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND (2 <= ANY(role))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Policies using the secure function

-- 1. UPDATE
DROP POLICY IF EXISTS "Admins can update users" ON "public"."users";
CREATE POLICY "Admins can update users" ON "public"."users"
FOR UPDATE USING (
  public.check_admin_access()
);

-- 2. INSERT (Required for upsert operations)
DROP POLICY IF EXISTS "Admins can insert users" ON "public"."users";
CREATE POLICY "Admins can insert users" ON "public"."users"
FOR INSERT WITH CHECK (
  public.check_admin_access()
);

-- 3. DELETE
DROP POLICY IF EXISTS "Admins can delete users" ON "public"."users";
CREATE POLICY "Admins can delete users" ON "public"."users"
FOR DELETE USING (
  public.check_admin_access()
);
