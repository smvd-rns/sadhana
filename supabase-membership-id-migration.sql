-- Create a sequence for the membership IDs starting from 1
CREATE SEQUENCE IF NOT EXISTS membership_seq START 1;

-- Create the membership_ids table
CREATE TABLE IF NOT EXISTS membership_ids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    membership_id TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    temple_code TEXT NOT NULL,
    sequential_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE membership_ids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own membership ID" ON membership_ids;
DROP POLICY IF EXISTS "Admins can manage all membership IDs" ON membership_ids;
DROP POLICY IF EXISTS "Anyone can read membership IDs" ON membership_ids;

-- RLS Policies
-- 1. Users can read their own membership ID
CREATE POLICY "Users can read own membership ID"
    ON membership_ids FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Anyone can read membership IDs (consistent with users table policy)
CREATE POLICY "Anyone can read membership IDs"
    ON membership_ids FOR SELECT
    USING (true);

-- 3. Admins (Role 8) can manage all membership IDs
CREATE POLICY "Admins can manage all membership IDs"
    ON membership_ids FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND (8 = ANY(role))
        )
    );

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_membership_ids_updated_at ON membership_ids;
CREATE TRIGGER update_membership_ids_updated_at
  BEFORE UPDATE ON membership_ids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC Function for atomic ID generation
CREATE OR REPLACE FUNCTION generate_membership_id(p_user_id UUID, p_year INTEGER, p_temple_code TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq_num INTEGER;
    v_membership_id TEXT;
BEGIN
    -- Check if user already has an ID
    IF EXISTS (SELECT 1 FROM membership_ids WHERE user_id = p_user_id) THEN
        SELECT membership_id INTO v_membership_id FROM membership_ids WHERE user_id = p_user_id;
        RETURN v_membership_id;
    END IF;

    -- Get next sequence value
    v_seq_num := nextval('membership_seq');
    
    -- Format: YYYYTTTMMMMM
    v_membership_id := p_year::TEXT || p_temple_code || lpad(v_seq_num::TEXT, 5, '0');
    
    -- Insert into table
    INSERT INTO membership_ids (user_id, membership_id, year, temple_code, sequential_num)
    VALUES (p_user_id, v_membership_id, p_year, p_temple_code, v_seq_num);
    
    RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
