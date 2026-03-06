-- Migration to add is_important column to the events table
-- This column allows marking specific announcements as "important" to highlight them in the user interface.

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false; -- Global Admin Pin (optional to keep)

ALTER TABLE event_responses
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false; -- Personal User Pin

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_is_important ON events(is_important);
CREATE INDEX IF NOT EXISTS idx_event_responses_is_pinned ON event_responses(is_pinned, user_id);

COMMENT ON COLUMN events.is_important IS 'Flag to mark an event/announcement as important';
COMMENT ON COLUMN event_responses.is_pinned IS 'Flag for users to personally pin an announcement to their list';


