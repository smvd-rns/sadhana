-- SQL Fix for RLS violations in Sadhana (Secondary) Database
-- Run this in the SQL Editor of your Sadhana Supabase project

-- 1. Enable RLS (if not already enabled)
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all for folders" ON public.folders;
DROP POLICY IF EXISTS "Allow all for files" ON public.files;
DROP POLICY IF EXISTS "Enable insert for owners" ON public.folders;
DROP POLICY IF EXISTS "Enable select for owners" ON public.folders;
DROP POLICY IF EXISTS "Enable insert for owners" ON public.files;
DROP POLICY IF EXISTS "Enable select for owners" ON public.files;
DROP POLICY IF EXISTS "Allow all access for folders" ON public.folders;
DROP POLICY IF EXISTS "Allow all access for files" ON public.files;

-- 3. Create "Open" policies for folders
-- NOTE: We use these because the Auth session is from a different Supabase project, 
-- so auth.uid() will be null on the Sadhana database side.
CREATE POLICY "Allow all access for folders" 
ON public.folders FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Create "Open" policies for files
CREATE POLICY "Allow all access for files" 
ON public.files FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Grant permissions to anon and authenticated roles
GRANT ALL ON public.folders TO anon, authenticated;
GRANT ALL ON public.files TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 6. Add google_drive_folder_id to folders table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='folders' AND column_name='google_drive_folder_id') THEN
        ALTER TABLE public.folders ADD COLUMN google_drive_folder_id TEXT;
    END IF;
END $$;
