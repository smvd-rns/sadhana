# Database Migration Guide: Separate Hierarchy Columns

This guide explains how to migrate from JSONB hierarchy to separate columns for better data segregation and query performance.

## Overview

The database schema has been updated to use separate columns (`state`, `city`, `center`, `counselor`) instead of storing everything in a JSONB `hierarchy` column. This provides:
- Better query performance
- Easier data segregation
- Simpler filtering and reporting
- Direct column access in SQL

## Migration Steps

### Step 1: Run the Migration SQL

Run the migration script in your Supabase SQL Editor:

```sql
-- File: migrations/001_add_separate_hierarchy_columns.sql

-- Step 1: Add new columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS center TEXT,
ADD COLUMN IF NOT EXISTS counselor TEXT;

-- Step 2: Migrate existing data from hierarchy JSONB to new columns
UPDATE users 
SET 
  state = hierarchy->>'state',
  city = hierarchy->>'city',
  center = hierarchy->>'center',
  counselor = hierarchy->>'counselor'
WHERE hierarchy IS NOT NULL AND hierarchy != '{}'::jsonb;

-- Step 3: Create indexes on new columns for better query performance
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_center ON users(center);
CREATE INDEX IF NOT EXISTS idx_users_counselor ON users(counselor);

-- Step 4: Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_state_city ON users(state, city);
CREATE INDEX IF NOT EXISTS idx_users_state_city_center ON users(state, city, center);
```

### Step 2: Verify Migration

After running the migration, verify the data:

```sql
-- Check if data was migrated correctly
SELECT 
  id, 
  name, 
  state, 
  city, 
  center, 
  counselor,
  hierarchy,
  profile_image
FROM users 
LIMIT 10;

-- Verify counts match
SELECT 
  COUNT(*) as total_users,
  COUNT(state) as users_with_state,
  COUNT(city) as users_with_city,
  COUNT(center) as users_with_center,
  COUNT(counselor) as users_with_counselor
FROM users;
```

### Step 3: Update Application Code

The application code has been updated to:
- **Write** to both separate columns AND JSONB (for backward compatibility)
- **Read** from separate columns first, fallback to JSONB if needed
- **Query** using separate columns for better performance

### Step 4: Optional - Remove JSONB Column (After Verification)

Once you've verified everything works correctly, you can optionally remove the JSONB column:

```sql
-- WARNING: Only run this after verifying all data is migrated and working
-- ALTER TABLE users DROP COLUMN hierarchy;
```

**Note**: The code currently keeps the JSONB column for backward compatibility. You can remove it later if desired.

## New Database Structure

### Users Table Columns

- `id` - UUID (Primary Key)
- `email` - TEXT (Unique)
- `name` - TEXT
- `role` - INTEGER[] (Array of role numbers)
- `phone` - TEXT (Optional)
- `profile_image` - TEXT (Google Drive photo link) ⭐ **NEW: Separate column for photo**
- `spiritual_level` - TEXT
- `state` - TEXT ⭐ **NEW: Separate column**
- `city` - TEXT ⭐ **NEW: Separate column**
- `center` - TEXT ⭐ **NEW: Separate column**
- `counselor` - TEXT ⭐ **NEW: Separate column**
- `hierarchy` - JSONB (Kept for backward compatibility)
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

## Benefits

1. **Better Performance**: Direct column queries are faster than JSONB queries
2. **Easier Filtering**: Simple WHERE clauses instead of JSONB operators
3. **Data Segregation**: Easy to filter users by state, city, center, or counselor
4. **Reporting**: Simpler SQL queries for analytics and reports
5. **Indexing**: Better index performance on individual columns

## Example Queries

### Before (JSONB):
```sql
SELECT * FROM users WHERE hierarchy->>'state' = 'Maharashtra';
```

### After (Separate Columns):
```sql
SELECT * FROM users WHERE state = 'Maharashtra';
```

### Complex Queries:
```sql
-- Find all users in a specific city
SELECT * FROM users WHERE state = 'Maharashtra' AND city = 'Mumbai';

-- Count users by state
SELECT state, COUNT(*) as user_count 
FROM users 
WHERE state IS NOT NULL 
GROUP BY state 
ORDER BY user_count DESC;

-- Find users by counselor
SELECT * FROM users WHERE counselor = 'John Doe';
```

## Profile Image

The `profile_image` column now stores the Google Drive photo link directly. This makes it:
- Easy to query users with/without photos
- Simple to display profile images
- Direct access without parsing JSONB

## Rollback Plan

If you need to rollback:

1. The JSONB `hierarchy` column is still present
2. The code reads from separate columns first, then falls back to JSONB
3. You can migrate data back to JSONB if needed:

```sql
UPDATE users 
SET hierarchy = jsonb_build_object(
  'state', state,
  'city', city,
  'center', center,
  'counselor', counselor
)
WHERE state IS NOT NULL OR city IS NOT NULL OR center IS NOT NULL OR counselor IS NOT NULL;
```

## Testing Checklist

After migration, test:
- [ ] User registration saves to separate columns
- [ ] Profile updates save to separate columns
- [ ] Profile image is saved to `profile_image` column
- [ ] User queries by hierarchy work correctly
- [ ] Existing users' data is migrated correctly
- [ ] Profile completion modal works
- [ ] Profile page displays and updates correctly
