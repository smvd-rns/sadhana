-- Add Project Manager, Project Advisor, and Acting Manager columns to centers table

ALTER TABLE centers
ADD COLUMN project_manager_id UUID REFERENCES auth.users(id),
ADD COLUMN project_manager_name TEXT,
ADD COLUMN project_advisor_id UUID REFERENCES auth.users(id),
ADD COLUMN project_advisor_name TEXT,
ADD COLUMN acting_manager_id UUID REFERENCES auth.users(id),
ADD COLUMN acting_manager_name TEXT;

COMMENT ON COLUMN centers.project_manager_id IS 'Reference to the Project Manager (Role 15)';
COMMENT ON COLUMN centers.project_advisor_id IS 'Reference to the Project Advisor (Role 14)';
COMMENT ON COLUMN centers.acting_manager_id IS 'Reference to the Acting Manager (Role 16)';
