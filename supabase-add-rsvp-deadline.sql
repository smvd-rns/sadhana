-- Migration to add rsvp_deadline column to the events table
-- This allows event creators to set a cut-off time, after which users can no longer confirm their attendance.

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMP WITH TIME ZONE;

-- Index for performance if checking deadlines in queries
CREATE INDEX IF NOT EXISTS idx_events_rsvp_deadline ON events(rsvp_deadline);

COMMENT ON COLUMN events.rsvp_deadline IS 'The date and time after which users cannot submit a new response or change their coming/not_coming status';
