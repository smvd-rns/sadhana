-- SQL Schema for Event Management (to be run on the SADHANA Supabase)

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL, -- Admin/Host User ID from main DB
    title TEXT NOT NULL,
    message TEXT,
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of {type, url, name}
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- The actual date the event occurs
    
    -- Filter targets
    target_ashrams TEXT[] DEFAULT '{}',
    target_roles TEXT[] DEFAULT '{}',
    target_temples TEXT[] DEFAULT '{}',
    target_centers TEXT[] DEFAULT '{}',
    target_camps TEXT[] DEFAULT '{}', -- Column names like 'campDys', 'campNistha'
    excluded_user_ids UUID[] DEFAULT '{}',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Event Responses (Attendance & Views)
CREATE TABLE IF NOT EXISTS event_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- User ID from main DB
    status TEXT NOT NULL CHECK (status IN ('seen', 'coming', 'not_coming')),
    reason TEXT, -- Reason for not coming
    
    -- Bulk update tracking
    is_bulk BOOLEAN DEFAULT FALSE,
    bulk_added_by UUID, -- PM User ID if bulk added
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each user has only one response per event
    UNIQUE(event_id, user_id)
);

-- 3. RLS Policies (Since Service Role Key is problematic, using Anon Key with RLS if needed)
-- Note: lib/supabase/sadhana.ts says it relies on inclusive RLS policy.

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_responses ENABLE ROW LEVEL SECURITY;

-- Allow all users to read events (filtering happens in app/API)
CREATE POLICY "Allow public read access to events"
ON events FOR SELECT
TO anon, authenticated
USING (true);

-- Allow admins to insert events (checking role should happen in app/API or via RLS if roles are shared)
-- For simplicity and following the 'inclusive' note, we'll allow authenticated for now, but in reality 
-- we'd check the user's role from the main DB (which requires cross-db functions or a shared user table).
-- Allow anyone to insert events (checking role should happen in app/API)
CREATE POLICY "Allow public insert access to events"
ON events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Responses policies
CREATE POLICY "Allow public access to responses"
ON event_responses FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_event_responses_event_id ON event_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_responses_user_id ON event_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
