-- 027_pm_rls_policies.sql
-- Grant Project Managers, Project Advisors, and Acting Managers access to users and profile requests in their assigned centers.

-- 1. Helper Function to get assigned center names for the current user
CREATE OR REPLACE FUNCTION public.get_assigned_center_names()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT name FROM public.centers
    WHERE project_manager_id = auth.uid()
       OR project_advisor_id = auth.uid()
       OR acting_manager_id = auth.uid()
       -- Add identifying roles 22-29 as well
       OR internal_manager_id = auth.uid()
       OR preaching_coordinator_id = auth.uid()
       OR morning_program_in_charge_id = auth.uid()
       OR mentor_id = auth.uid()
       OR frontliner_id = auth.uid()
       OR accountant_id = auth.uid()
       OR kitchen_head_id = auth.uid()
       OR study_in_charge_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update users table policies
-- Allow PMs/assigned roles to see and update users in their centers
CREATE POLICY "Center Managers access assigned users" ON "public"."users"
FOR ALL USING (
  current_center = ANY(public.get_assigned_center_names())
  AND (role && ARRAY[14, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29])
);

-- 3. Update profile_update_requests table policies
-- Allow PMs/assigned roles to see and update profile requests in their centers
CREATE POLICY "Center Managers access profile requests" ON "public"."profile_update_requests"
FOR ALL USING (
  center_name = ANY(public.get_assigned_center_names())
  AND (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (role && ARRAY[14, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29])
    )
  )
);
