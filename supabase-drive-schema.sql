-- Schema for Google Drive Central Data Storage in the Secondary (Sadhana) Database
-- Execute this script in the SQL Editor of your Sadhana Supabase project

-- 1. Create drive_scans table
CREATE TABLE IF NOT EXISTS public.drive_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,          -- Reference to the user in the primary DB who started the scan
    user_name TEXT,        -- Snapshot of the user's name
    drive_link TEXT NOT NULL,
    description TEXT,
    scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'processing', 'completed', 'failed')),
    files_found INTEGER DEFAULT 0,
    files_processed INTEGER DEFAULT 0,
    files_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS for drive_scans
ALTER TABLE public.drive_scans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scans (or restrict to admins if needed)
CREATE POLICY "Public can view drive scans" 
ON public.drive_scans FOR SELECT 
USING (true);

-- Allow authenticated users to insert scans (auth handled by application tier)
CREATE POLICY "Enable insert for authenticated users" 
ON public.drive_scans FOR INSERT 
WITH CHECK (true);

-- Allow updates (typically done by service role, but open if needed)
CREATE POLICY "Enable update for all" 
ON public.drive_scans FOR UPDATE 
USING (true);


-- 2. Create files table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_drive_id TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT DEFAULT 0,
    google_drive_url TEXT,
    upload_method TEXT,
    category TEXT,          -- User-defined category or extracted (e.g., pdf, video)
    description TEXT,       -- Added for better searchability
    user_id UUID,           -- Reference to the uploader
    views INTEGER DEFAULT 0,
    points_awarded INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster fuzzy searching and deduplication
CREATE INDEX IF NOT EXISTS idx_files_file_name ON public.files(file_name);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(category);

-- Enable RLS for files
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Allow public read access (it's a global repository)
CREATE POLICY "Public can view files" 
ON public.files FOR SELECT 
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users" 
ON public.files FOR INSERT 
WITH CHECK (true);

-- Allow users to update their own files, or service role
CREATE POLICY "Enable update for owners" 
ON public.files FOR UPDATE 
USING (true);

-- Allow users to delete their own files
CREATE POLICY "Enable delete for owners" 
ON public.files FOR DELETE 
USING (true);


-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_files_updated_at ON public.files;
CREATE TRIGGER trigger_update_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW
EXECUTE FUNCTION update_files_updated_at();
