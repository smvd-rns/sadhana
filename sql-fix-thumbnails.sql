-- SQL Fix to add thumbnail_link and update RLS for file deletion
-- Run this in the SQL Editor of your Sadhana (Secondary) Supabase project

-- 1. Add the thumbnail_link column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='thumbnail_link') THEN
        ALTER TABLE public.files ADD COLUMN thumbnail_link TEXT;
    END IF;
END $$;

-- 2. Update RLS Policies to allow creators to delete their own files
-- First drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Enable delete for owners" ON public.files;

-- Re-create delete policy
CREATE POLICY "Enable delete for owners" 
ON public.files FOR DELETE 
USING (auth.uid() = user_id OR (metadata->>'uploader_id')::uuid = auth.uid());

-- Optional: Ensure user_id is NOT NULL if we want to enforce ownership (but drive_scan might not have a user_id if not logged in?)
-- Our app currently stores user.id in user_id, so it should be fine.
