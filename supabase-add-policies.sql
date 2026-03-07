-- Drop the table if it exists to start fresh (in case of partial execution)
DROP TABLE IF EXISTS policies;

-- Create the policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    applicable_date DATE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_id TEXT NOT NULL, -- Google drive ID
    file_type TEXT,
    target_roles INTEGER[] DEFAULT '{}', -- Array of roles (1-30) that can view this policy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Anyone authenticated can view policies (api endpoint will handle further filtering)
CREATE POLICY "Anyone authenticated can view policies" ON policies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Better role checking that handles integer array
CREATE POLICY "Superadmins can insert policies" ON policies
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND 8 = ANY(role)
    ));

CREATE POLICY "Superadmins can update policies" ON policies
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND 8 = ANY(role)
    ));

CREATE POLICY "Superadmins can delete policies" ON policies
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND 8 = ANY(role)
    ));
