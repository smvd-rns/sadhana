# Supabase Migration Guide

This guide will help you migrate from Firebase to Supabase for the ISKCON Sadhana Platform.

## Why Migrate to Supabase?

- **Better Pricing**: Supabase offers more generous free tier and better pricing for high read/write operations
- **PostgreSQL**: Full SQL database with better query capabilities
- **No Read/Write Limits**: Unlike Firebase, Supabase doesn't charge per read/write operation
- **Better for 1000+ Users**: More scalable for large user bases

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js 18+ installed
3. Basic understanding of SQL

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `iskcon-sadhana-platform` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `Asia South (Mumbai)` for India)
5. Click "Create new project"
6. Wait 2-3 minutes for the project to be set up

## Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** (gear icon) > **API**
2. You'll find:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`
   - **service_role key**: (Keep this secret! Only for server-side operations)

3. Copy these values - you'll need them in Step 4

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

This creates:
- `users` table
- `sadhana_reports` table
- `messages` table
- Indexes for performance
- Row Level Security (RLS) policies

## Step 4: Configure Environment Variables

1. Create or update `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: For server-side operations (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Replace `xxxxx` with your actual Supabase project URL
3. Replace the anon key with your actual anon/public key

## Step 5: Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Email** provider
3. Make sure it's **Enabled**
4. **IMPORTANT**: Go to **Authentication** > **Settings** > **Auth Settings**
5. Under **Email Auth**, you have two options:
   - **Enable email confirmations**: If enabled, users must confirm email before signing in
   - **Disable email confirmations**: Users can sign in immediately after registration
   
   **For development/testing**: We recommend **disabling email confirmations** initially
   - Uncheck "Enable email confirmations"
   - Click "Save"
   
   **For production**: Enable email confirmations for security
6. Configure email templates if needed (optional)

## Step 6: Update Your Code

All code has already been updated! The following files now use Supabase:

- `lib/supabase/config.ts` - Supabase client configuration
- `lib/supabase/auth.ts` - Authentication functions
- `lib/supabase/sadhana.ts` - Sadhana reports functions
- `lib/supabase/users.ts` - User management functions
- `lib/supabase/messages.ts` - Messaging functions
- All components have been updated to import from `@/lib/supabase/*`

## Step 7: Install Dependencies

Run this command to install Supabase client:

```bash
npm install @supabase/supabase-js
```

## Step 8: Test the Migration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the following:
   - **Registration**: Create a new user account
   - **Login**: Sign in with the new account
   - **Sadhana**: Submit a sadhana report
   - **Users**: View users list (if admin)
   - **Messages**: Send/receive messages

3. Check Supabase dashboard:
   - Go to **Table Editor** to see your data
   - Go to **Authentication** > **Users** to see registered users

## Step 9: Migrate Existing Data (If Applicable)

If you have existing Firebase data, you'll need to export and import it:

### Export from Firebase:

1. Use Firebase Console to export data
2. Or use Firebase Admin SDK to export collections

### Import to Supabase:

1. Convert Firebase data format to match Supabase schema
2. Use Supabase dashboard **Table Editor** to import
3. Or create a migration script using Supabase client

**Important Notes:**
- User IDs need to match between Firebase Auth and Supabase Auth
- Date formats need to be converted
- Role numbers should remain the same (1-8)

## Step 10: Update Deployment

### For Vercel:

1. Go to your Vercel project settings
2. Go to **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy your application

### For Render:

1. Go to your Render service settings
2. Go to **Environment** section
3. Add the same environment variables
4. Redeploy

## Troubleshooting

### Issue: "Supabase is not initialized"

**Solution**: Check that environment variables are set correctly in `.env.local`

### Issue: "Invalid API key"

**Solution**: Make sure you're using the `anon/public` key, not the `service_role` key in the client

### Issue: "Row Level Security policy violation"

**Solution**: 
1. Check RLS policies in Supabase dashboard
2. Make sure users are authenticated
3. For admin operations, you may need to use service_role key on server-side

### Issue: "Table does not exist"

**Solution**: Make sure you ran the SQL schema file in Step 3

### Issue: Authentication not working

**Solution**:
1. Check that Email provider is enabled in Supabase
2. Check Supabase project URL is correct
3. Check browser console for errors

## Database Schema Reference

### Users Table
- `id` (UUID) - Primary key, matches Supabase Auth user ID
- `email` (TEXT) - User email
- `name` (TEXT) - User name
- `role` (INTEGER[]) - Array of role numbers (1-8)
- `hierarchy` (JSONB) - User location hierarchy
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

### Sadhana Reports Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `date` (DATE) - Report date
- `japa`, `hearing`, `reading` (INTEGER) - Spiritual practice marks
- `to_bed`, `wake_up`, `daily_filling`, `day_sleep` (INTEGER) - Body metrics
- `body_percent`, `soul_percent` (NUMERIC) - Calculated percentages
- `submitted_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

### Messages Table
- `id` (UUID) - Primary key
- `sender_id` (UUID) - Foreign key to users
- `recipient_ids` (UUID[]) - Array of recipient user IDs
- `recipient_groups` (TEXT[]) - Array of group IDs
- `subject`, `content` (TEXT) - Message content
- `read_by` (UUID[]) - Array of user IDs who read the message
- `created_at` (TIMESTAMPTZ) - Timestamp

## Security Notes

1. **Never expose service_role key** in client-side code
2. **Use RLS policies** to secure data access
3. **Validate user permissions** in application code
4. **Use anon key** for client-side operations
5. **Use service_role key** only for server-side admin operations

## Next Steps

1. Test all features thoroughly
2. Monitor Supabase dashboard for any errors
3. Set up database backups (Supabase Pro plan)
4. Configure email templates for better UX
5. Set up monitoring and alerts

## Support

- Supabase Docs: [https://supabase.com/docs](https://supabase.com/docs)
- Supabase Discord: [https://discord.supabase.com](https://discord.supabase.com)
- Supabase GitHub: [https://github.com/supabase/supabase](https://github.com/supabase/supabase)

## Migration Checklist

- [ ] Created Supabase project
- [ ] Got Supabase credentials
- [ ] Ran database schema SQL
- [ ] Updated environment variables
- [ ] Enabled Email authentication
- [ ] Installed Supabase client
- [ ] Tested registration
- [ ] Tested login
- [ ] Tested sadhana submission
- [ ] Tested user management
- [ ] Tested messaging
- [ ] Updated deployment environment variables
- [ ] Migrated existing data (if applicable)
- [ ] Tested in production

---

**Congratulations!** Your application is now running on Supabase! 🎉
