-- Add pinned messages support
-- Run this SQL in your Supabase SQL Editor

-- Add pinned_by column to track which users have pinned each message
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS pinned_by UUID[] DEFAULT ARRAY[]::UUID[];

-- Create index for efficient pinned message queries
CREATE INDEX IF NOT EXISTS idx_messages_pinned_by ON messages USING GIN(pinned_by);

-- Add comment for documentation
COMMENT ON COLUMN messages.pinned_by IS 'Array of user IDs who have pinned this message';
