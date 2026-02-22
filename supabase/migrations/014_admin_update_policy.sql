-- Allow Admins to update other users
-- This is necessary for the approval flow where an admin updates the verification_status of another user

DROP POLICY IF EXISTS "Admins can update users" ON "public"."users";

CREATE POLICY "Admins can update users" ON "public"."users"
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.users
    WHERE 
      -- Check if role array contains any admin or counselor role number (>= 2)
      -- The 'role' column is integer[], so we use array operators.
      -- 2 <= ANY(role) finds if any element in the array is greater than or equal to 2.
      2 <= ANY(role)
  )
);

-- Also allow admins to delete/reject users if needed
DROP POLICY IF EXISTS "Admins can delete users" ON "public"."users";

CREATE POLICY "Admins can delete users" ON "public"."users"
FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM public.users
    WHERE 
      2 <= ANY(role)
  )
);
