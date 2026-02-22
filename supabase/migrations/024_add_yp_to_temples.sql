-- Add Youth Preacher columns to temples table
ALTER TABLE temples
ADD COLUMN yp_id UUID REFERENCES auth.users(id),
ADD COLUMN yp_name TEXT;

COMMENT ON COLUMN temples.yp_id IS 'Reference to the Youth Preacher (Role 21) for this temple';
COMMENT ON COLUMN temples.yp_name IS 'Cached name of the Youth Preacher';
