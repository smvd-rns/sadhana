-- Migration to add broadcast messaging support
-- Run this SQL in your Supabase SQL Editor

-- Add broadcast-related columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_role INTEGER;

-- Create index on is_broadcast for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_is_broadcast ON messages(is_broadcast);

-- Add comment for documentation
COMMENT ON COLUMN messages.is_broadcast IS 'Indicates if this message is a broadcast message sent to all users';
COMMENT ON COLUMN messages.sender_role IS 'Role number of the sender (for display purposes)';
