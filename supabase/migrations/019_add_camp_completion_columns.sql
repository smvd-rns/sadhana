-- Add camp completion columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS camp_dys BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_sankalpa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_sphurti BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_utkarsh BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_faith_and_doubt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_srcgd_workshop BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_nistha BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS camp_ashray BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN users.camp_dys IS 'Discover Your Self (DYS) camp completion status';
COMMENT ON COLUMN users.camp_sankalpa IS 'Sankalpa camp completion status';
COMMENT ON COLUMN users.camp_sphurti IS 'Sphurti camp completion status';
COMMENT ON COLUMN users.camp_utkarsh IS 'Utkarsh camp completion status';
COMMENT ON COLUMN users.camp_faith_and_doubt IS 'Faith and Doubt camp completion status';
COMMENT ON COLUMN users.camp_srcgd_workshop IS 'SRCGD Workshop completion status';
COMMENT ON COLUMN users.camp_nistha IS 'Nistha camp completion status';
COMMENT ON COLUMN users.camp_ashray IS 'Ashray camp completion status';
