-- Complete Messages Table Migration
-- This adds all missing columns needed for the broadcast feature
-- Run this SQL in your Supabase SQL Editor

-- Add priority column (normal or urgent)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent'));

-- Add category column (spiritual, administrative, or events)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'administrative' CHECK (category IN ('spiritual', 'administrative', 'events'));

-- Add broadcast-related columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_role INTEGER;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_is_broadcast ON messages(is_broadcast);

-- Add comments for documentation
COMMENT ON COLUMN messages.priority IS 'Message priority: normal or urgent';
COMMENT ON COLUMN messages.category IS 'Message category: spiritual, administrative, or events';
COMMENT ON COLUMN messages.is_broadcast IS 'Indicates if this message is a broadcast message sent to all users';
COMMENT ON COLUMN messages.sender_role IS 'Role number of the sender (for display purposes)';

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name IN ('priority', 'category', 'is_broadcast', 'sender_role')
ORDER BY column_name;
