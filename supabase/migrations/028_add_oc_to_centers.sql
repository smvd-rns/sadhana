-- Add OC (Role 17) columns to centers table

ALTER TABLE centers
ADD COLUMN oc_id UUID REFERENCES auth.users(id),
ADD COLUMN oc_name TEXT;

COMMENT ON COLUMN centers.oc_id IS 'Reference to the OC (Role 17)';
