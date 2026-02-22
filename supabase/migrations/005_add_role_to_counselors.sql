-- Add role column to counselors table if it doesn't exist
ALTER TABLE public.counselors 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'counselor';

-- Update existing records to have a default role
UPDATE public.counselors 
SET role = 'counselor' 
WHERE role IS NULL;

-- Comment on column
COMMENT ON COLUMN public.counselors.role IS 'Role of the person: "counselor" or "care_giver"';
