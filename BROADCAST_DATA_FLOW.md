# Broadcast Message Data Flow

## What Data Gets Saved

When you send a broadcast message, here's exactly what gets saved to the database:

```
┌─────────────────────────────────────────────────────────────┐
│                    BROADCAST MESSAGE                         │
│                                                              │
│  From: Super Admin (John Doe)                               │
│  To: All Users (150 users)                                  │
│  Subject: "Important Announcement"                          │
│  Content: "This is a test broadcast message..."            │
│  Priority: Urgent                                           │
│  Category: Administrative                                   │
│  Sent: 2026-01-15 11:30:00                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    SAVED TO DATABASE
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              messages TABLE (Supabase)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  id: "550e8400-e29b-41d4-a716-446655440000"                │
│  sender_id: "abc123..." (Super Admin's UUID)               │
│  sender_role: 8 (Super Admin role number)                  │
│  recipient_ids: ["user1-uuid", "user2-uuid", ...]         │
│  subject: "Important Announcement"                          │
│  content: "This is a test broadcast message..."            │
│  priority: "urgent"                                         │
│  category: "administrative"                                 │
│  is_broadcast: true                                         │
│  read_by: [] (empty initially)                             │
│  created_at: "2026-01-15T11:30:00.000Z"                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  DISPLAYED TO USERS
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   USER'S MESSAGES PAGE                       │
│                                                              │
│  📧 [BROADCAST] Important Announcement                      │
│     From: John Doe                                          │
│     Jan 15, 2026 11:30 AM                                  │
│     This is a test broadcast message...                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Current messages Table Structure

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id),
  sender_role INTEGER,              -- NEW: Sender's role number
  recipient_ids UUID[],              -- Array of all recipient user IDs
  recipient_groups TEXT[],
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT,                     -- 'normal' or 'urgent'
  category TEXT,                     -- 'spiritual', 'administrative', 'events'
  is_broadcast BOOLEAN DEFAULT FALSE, -- NEW: Marks broadcast messages
  read_by UUID[],                    -- Array of users who have read the message
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## How Sender Name is Retrieved

The sender's name is NOT stored directly in the messages table. Instead, it's retrieved via a JOIN:

```sql
SELECT 
  messages.*,
  users.name as sender_name
FROM messages
JOIN users ON messages.sender_id = users.id
WHERE user_id = ANY(messages.recipient_ids)
```

This is handled automatically in the code:

```typescript
// In lib/supabase/messages.ts
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    sender:users!messages_sender_id_fkey(name)
  `)
  .contains('recipient_ids', [userId])
```

## Recipient Information

### How Recipients are Stored

- **Broadcast Messages**: `recipient_ids` contains ALL user IDs in the system
- **Regular Messages**: `recipient_ids` contains specific user IDs

### Example Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sender_id": "abc123-sender-uuid",
  "sender_role": 8,
  "recipient_ids": [
    "user1-uuid-here",
    "user2-uuid-here",
    "user3-uuid-here",
    "... (all 150 users)"
  ],
  "subject": "Important Announcement",
  "content": "This is a test broadcast message to all users.",
  "priority": "urgent",
  "category": "administrative",
  "is_broadcast": true,
  "read_by": [],
  "created_at": "2026-01-15T11:30:00.000Z"
}
```

## Tracking Who Has Read the Message

The `read_by` array tracks which users have read the message:

```json
{
  "read_by": [
    "user1-uuid",  // User 1 has read it
    "user5-uuid",  // User 5 has read it
    // ... other users who have read it
  ]
}
```

When a user opens a message, their UUID is added to this array.

## Summary

✅ **Sender Information**: Saved as `sender_id` (UUID) and `sender_role` (number)
✅ **Sender Name**: Retrieved via JOIN with users table
✅ **Recipients**: Saved as array of UUIDs in `recipient_ids`
✅ **Message Content**: Saved in `subject` and `content` fields
✅ **Metadata**: `priority`, `category`, `is_broadcast` flags
✅ **Timestamps**: `created_at` automatically set
✅ **Read Status**: Tracked in `read_by` array

All of this data is automatically saved when you send a broadcast message!
