# Role Number Migration Guide

## Overview

Roles are now stored as **numbers (1-8)** in Firestore instead of string names. This makes role management easier - you can simply change the number instead of writing role names.

## Role Number Mapping

| Number | Role Name           | Description                    |
|--------|---------------------|--------------------------------|
| 8      | super_admin         | Full system access             |
| 7      | zonal_admin         | Multi-state oversight          |
| 6      | state_admin         | State-wide management          |
| 5      | city_admin          | City-level coordination        |
| 4      | center_admin        | Center operations              |
| 3      | senior_counselor    | Multiple group oversight       |
| 2      | counselor           | Direct student mentorship      |
| 1      | student             | Personal reporting (default)   |

## How It Works

### Automatic Conversion

The system automatically handles conversion between role names and numbers:

- **When saving to Firestore**: Role names (strings) are converted to numbers
- **When reading from Firestore**: Role numbers are converted back to role names
- **In the UI**: Everything still works with role names - conversion is transparent

### Backward Compatibility

The system supports both formats:
- **Old format**: String roles like `"student"`, `"super_admin"` (still works)
- **New format**: Number roles like `1`, `8` (preferred)

When reading from Firestore, the system automatically detects the format and converts it appropriately.

## Code Changes

### 1. Role Utilities (`lib/utils/roles.ts`)

New functions added:
- `roleToNumber()` - Converts role name(s) to number(s)
- `numberToRole()` - Converts role number(s) to name(s)
- `normalizeRoleFromFirestore()` - Handles both old and new formats

### 2. Authentication (`lib/firebase/auth.ts`)

- `signUp()` now converts roles to numbers before saving
- `getUserData()` converts role numbers back to names when reading

### 3. User Management (`lib/firebase/users.ts`)

- `updateUser()` converts roles to numbers before saving
- All user fetching functions convert role numbers back to names

### 4. Firestore Security Rules (`firestore.rules`)

Updated to handle both numeric and string role formats:
- `hasRole()` - Checks for role in both formats
- `isAdmin()` - Detects admin roles (4-8) in both formats

## Manual Role Updates in Firestore

### Single Role
```json
{
  "role": 1
}
```

### Multiple Roles (Array)
```json
{
  "role": [4, 5, 6]
}
```

### Examples

**Make a user a student:**
```json
{
  "role": 1
}
```

**Make a user a center admin:**
```json
{
  "role": 4
}
```

**Make a user both center admin and city admin:**
```json
{
  "role": [4, 5]
}
```

**Make a user super admin:**
```json
{
  "role": 8
}
```

## Benefits

1. **Easier Management**: Change `1` to `8` instead of `"student"` to `"super_admin"`
2. **Less Typo Risk**: Numbers are less prone to typos than strings
3. **Smaller Storage**: Numbers take less space than strings
4. **Backward Compatible**: Old string format still works

## Migration Notes

- **No action required** for existing users - the system handles both formats
- New users will have roles saved as numbers automatically
- UI components continue to work with role names (conversion is transparent)
- Firestore rules support both formats for security

## Testing

To verify the migration is working:

1. Register a new user - check Firestore, role should be `1` (not `"student"`)
2. Update a user's role via the UI - check Firestore, should be a number
3. Read user data - should still work correctly in the UI
4. Check Firestore rules - should allow access based on numeric roles
