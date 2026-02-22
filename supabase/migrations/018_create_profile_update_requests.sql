-- 018_create_profile_update_requests.sql
-- Create table for storing pending profile update requests (spiritual information)

CREATE TABLE IF NOT EXISTS profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_changes JSONB NOT NULL,
    current_values JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_feedback TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profile_req_user ON profile_update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_req_status ON profile_update_requests(status);

-- Enable RLS
ALTER TABLE profile_update_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own requests
CREATE POLICY "Users can view own profile requests"
    ON profile_update_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Admins (Role 8) can view all requests
CREATE POLICY "Admins can view all profile requests"
    ON profile_update_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND 8 = ANY(role)
        )
    );

-- Admins (Role 8) can update (review) requests
CREATE POLICY "Admins can update profile requests"
    ON profile_update_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND 8 = ANY(role)
        )
    );

COMMENT ON TABLE profile_update_requests IS 'Stores pending changes to user profiles that require admin approval';
