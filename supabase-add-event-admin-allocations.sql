-- Migration to create the event_admin_allocations table
-- This allows Super Admins to specify which Temples/Centers an Event Admin (Role 30) can broadcast to.

CREATE TABLE IF NOT EXISTS public.event_admin_allocations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    allowed_temples TEXT[] DEFAULT '{}'::TEXT[],
    allowed_centers TEXT[] DEFAULT '{}'::TEXT[],
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.event_admin_allocations ENABLE ROW LEVEL SECURITY;

-- Anyone can read (so the app can check permissions)
CREATE POLICY "Enable read access for all users" ON public.event_admin_allocations FOR SELECT USING (true);

-- Only super admins can insert/update/delete
-- Since we do this via backend API with service role mostly, but we can add policy just in case.
CREATE POLICY "Enable all access for super admins" ON public.event_admin_allocations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users WHERE users.id = auth.uid() AND (8 = ANY(users.role::integer[]))
    )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_event_admin_allocations_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_event_admin_allocations_timestamp ON public.event_admin_allocations;

CREATE TRIGGER set_event_admin_allocations_timestamp
BEFORE UPDATE ON public.event_admin_allocations
FOR EACH ROW
EXECUTE FUNCTION update_event_admin_allocations_updated_at_column();
