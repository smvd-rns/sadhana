-- 041_alter_donations_table.sql
-- Add missing columns required by the new payment gateway integration to the existing donations table

-- We use ADD COLUMN IF NOT EXISTS so it won't fail if some columns are already there.
ALTER TABLE public.donations 
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS payment_id TEXT,
    ADD COLUMN IF NOT EXISTS txnid TEXT,
    ADD COLUMN IF NOT EXISTS tag_user_id UUID, 
    ADD COLUMN IF NOT EXISTS center TEXT,
    ADD COLUMN IF NOT EXISTS temple TEXT,
    ADD COLUMN IF NOT EXISTS ashram TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
