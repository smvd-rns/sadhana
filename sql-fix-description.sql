-- Run this in the SQL Editor of your Sadhana (Secondary) Supabase project

-- 1. Add the column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='description') THEN
        ALTER TABLE public.files ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. Force Refresh Schema Cache (PostgREST)
-- Note: In most Supabase instances, simply adding a column triggers this, 
-- but you can manually notify if needed.
NOTIFY pgrst, 'reload schema';
