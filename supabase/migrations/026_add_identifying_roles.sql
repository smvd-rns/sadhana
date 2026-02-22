-- Add Identifying Roles (22-29) columns to centers table

ALTER TABLE centers
ADD COLUMN internal_manager_id UUID REFERENCES auth.users(id),
ADD COLUMN internal_manager_name TEXT,
ADD COLUMN preaching_coordinator_id UUID REFERENCES auth.users(id),
ADD COLUMN preaching_coordinator_name TEXT,
ADD COLUMN morning_program_in_charge_id UUID REFERENCES auth.users(id),
ADD COLUMN morning_program_in_charge_name TEXT,
ADD COLUMN mentor_id UUID REFERENCES auth.users(id),
ADD COLUMN mentor_name TEXT,
ADD COLUMN frontliner_id UUID REFERENCES auth.users(id),
ADD COLUMN frontliner_name TEXT,
ADD COLUMN accountant_id UUID REFERENCES auth.users(id),
ADD COLUMN accountant_name TEXT,
ADD COLUMN kitchen_head_id UUID REFERENCES auth.users(id),
ADD COLUMN kitchen_head_name TEXT,
ADD COLUMN study_in_charge_id UUID REFERENCES auth.users(id),
ADD COLUMN study_in_charge_name TEXT;

COMMENT ON COLUMN centers.internal_manager_id IS 'Reference to the Internal Manager (Role 22)';
COMMENT ON COLUMN centers.preaching_coordinator_id IS 'Reference to the Preaching Coordinator (Role 23)';
COMMENT ON COLUMN centers.morning_program_in_charge_id IS 'Reference to the Morning Program In-charge (Role 24)';
COMMENT ON COLUMN centers.mentor_id IS 'Reference to the Mentor (Role 25)';
COMMENT ON COLUMN centers.frontliner_id IS 'Reference to the Frontliner (Role 26)';
COMMENT ON COLUMN centers.accountant_id IS 'Reference to the Accountant (Role 27)';
COMMENT ON COLUMN centers.kitchen_head_id IS 'Reference to the Kitchen Head (Role 28)';
COMMENT ON COLUMN centers.study_in_charge_id IS 'Reference to the Study In-charge (Role 29)';
