-- Migration: Create user_centers table for many-to-many relationship
-- Description: Allows assigning multiple centers to a single user (e.g., Project Advisors)

CREATE TABLE IF NOT EXISTS user_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, center_id)
);

-- Add comments
COMMENT ON TABLE user_centers IS 'Junction table for mapping users to multiple centers (e.g., Project Advisors)';

-- RLS Policies
ALTER TABLE user_centers ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read (for now, similar to other tables to ensure visibility)
CREATE POLICY "Allow public read access" ON user_centers
    FOR SELECT USING (true);

-- Policy: Authenticated users can insert/delete (controlled by API logic mostly, but good for RLS)
-- Ideally this should be restricted to admins, but keeping it consistent with the project's current lenient RLS for authenticated users
CREATE POLICY "Allow authenticated full access" ON user_centers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_centers TO authenticated;
GRANT ALL ON user_centers TO service_role;
