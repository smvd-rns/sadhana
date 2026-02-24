-- 029_add_counselor_id_to_users.sql
-- Add counselor_id column to users table to link users to their counselor's user_id

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS counselor_id UUID REFERENCES public.counselors(id) ON DELETE SET NULL;
