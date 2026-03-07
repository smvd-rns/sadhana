-- Migration: Add UPDATE RLS policy on events table in the Sadhana DB
-- Run this in the Sadhana Supabase SQL Editor (qfrcoaatgubverfpgoaw.supabase.co)

-- Allow all users to update events (authorization is enforced in the application layer)
-- This is required because the service role key wasn't being used earlier,
-- and the anon/authenticated key had no UPDATE permission, causing silent failures.
CREATE POLICY IF NOT EXISTS "Allow public update access to events"
ON events FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Also ensure the rsvp_deadline column exists (run after main schema)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMP WITH TIME ZONE;
