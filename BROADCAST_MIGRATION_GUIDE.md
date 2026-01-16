# How to Run the Broadcast Feature Database Migration

## Error You're Seeing

```
Error: Could not find the 'is_broadcast' column of 'messages' in the schema cache
```

This means the database migration hasn't been run yet. Follow the steps below to fix this.

## Step-by-Step Migration Instructions

### 1. Open Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### 2. Navigate to SQL Editor

1. Click on **SQL Editor** in the left sidebar
2. Click **New Query** button

### 3. Run the Migration

Copy and paste this SQL code into the editor:

```sql
-- Migration to add broadcast messaging support
-- This adds the necessary columns to support broadcast messages

-- Add broadcast-related columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_role INTEGER;

-- Create index on is_broadcast for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_is_broadcast ON messages(is_broadcast);

-- Add comment for documentation
COMMENT ON COLUMN messages.is_broadcast IS 'Indicates if this message is a broadcast message sent to all users';
COMMENT ON COLUMN messages.sender_role IS 'Role number of the sender (for display purposes)';
```

### 4. Execute the Migration

1. Click the **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for the success message
3. You should see: "Success. No rows returned"

### 5. Verify the Migration

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name IN ('is_broadcast', 'sender_role');
```

You should see both columns listed.

### 6. Test the Broadcast Feature

1. Refresh your application in the browser
2. Log in as a super admin (role 8)
3. Navigate to `/dashboard/broadcast`
4. Try sending a test broadcast message

## What Gets Saved in the Database

When you send a broadcast message, the following data is saved:

### Message Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| `id` | Unique message ID | UUID |
| `sender_id` | User ID of sender | UUID |
| `sender_name` | Name of sender (via join) | "Admin User" |
| `recipient_ids` | Array of all user IDs | `[uuid1, uuid2, ...]` |
| `subject` | Message subject | "Important Announcement" |
| `content` | Message content | "This is a test broadcast..." |
| `priority` | Message priority | "normal" or "urgent" |
| `category` | Message category | "spiritual", "administrative", or "events" |
| `is_broadcast` | Broadcast flag | `true` |
| `sender_role` | Sender's role number | `8` |
| `read_by` | Array of users who read it | `[]` initially |
| `created_at` | Timestamp when sent | ISO timestamp |

All of this data is automatically saved when you send a broadcast message!

## Troubleshooting

### If migration fails:

1. Check if you have the correct permissions
2. Make sure you're connected to the right database
3. Try running each ALTER TABLE statement separately

### If you still see errors:

1. Clear your browser cache
2. Restart your Next.js development server
3. Check the Supabase logs for any errors

## Need Help?

If you encounter any issues, please share:
1. The exact error message
2. Screenshot of the SQL Editor
3. Any error logs from the browser console
