# Troubleshooting Guide - Supabase Migration

## Common Issues and Solutions

### Issue 1: 400 Bad Request on Signup/Login

**Error**: `POST https://xxxxx.supabase.co/auth/v1/signup 400 (Bad Request)`

**Possible Causes & Solutions**:

1. **Email Confirmation Required**
   - **Solution**: Go to Supabase Dashboard > Authentication > Settings > Auth Settings
   - Uncheck "Enable email confirmations" for development
   - Or handle email confirmation in your app

2. **Invalid Email Format**
   - **Solution**: Make sure email is valid format (e.g., `user@example.com`)
   - The code now validates email format before sending

3. **Password Too Short**
   - **Solution**: Supabase requires minimum 6 characters
   - The code now validates password length

4. **Email Already Registered**
   - **Solution**: User already exists, try signing in instead
   - Or delete the user from Supabase dashboard

5. **Database Table Not Created**
   - **Solution**: Make sure you ran the SQL schema file
   - Check Supabase dashboard > Table Editor to verify tables exist

### Issue 2: "Supabase is not initialized"

**Error**: `Supabase is not initialized`

**Solution**:
1. Check `.env.local` file exists
2. Verify environment variables are set:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
3. Restart your development server after adding env variables
4. Make sure variable names match exactly (case-sensitive)

### Issue 3: "Row Level Security policy violation"

**Error**: `new row violates row-level security policy`

**Solution**:
1. Check that user is authenticated
2. Verify RLS policies in Supabase dashboard > Authentication > Policies
3. For admin operations, you may need to use service_role key
4. Check that user ID matches between auth and database

### Issue 4: "Table does not exist"

**Error**: `relation "users" does not exist`

**Solution**:
1. Go to Supabase dashboard > SQL Editor
2. Run the `supabase-schema.sql` file
3. Verify tables exist in Table Editor
4. Check for any SQL errors in the output

### Issue 5: Authentication Not Working

**Symptoms**: Can't sign in or sign up

**Solutions**:
1. **Check Email Provider**:
   - Go to Authentication > Providers
   - Make sure Email is enabled

2. **Check Email Confirmation Settings**:
   - Go to Authentication > Settings > Auth Settings
   - For development: Disable email confirmations
   - For production: Enable and configure email templates

3. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Check Console tab for detailed error messages
   - Check Network tab for failed requests

4. **Verify Credentials**:
   - Double-check Supabase URL and anon key
   - Make sure they're in `.env.local` file
   - Restart dev server after changes

### Issue 6: Data Not Appearing

**Symptoms**: Registration works but data doesn't show

**Solutions**:
1. **Check Database**:
   - Go to Supabase dashboard > Table Editor
   - Check if data exists in tables
   - Verify user was created in `users` table

2. **Check RLS Policies**:
   - Users can only see their own data by default
   - Admins need special policies to see all data
   - Check Authentication > Policies

3. **Check User ID**:
   - Make sure `users.id` matches `auth.users.id`
   - They should be the same UUID

### Issue 7: Import Errors

**Error**: `Cannot find module '@/lib/supabase/...'`

**Solution**:
1. Make sure all files were created:
   - `lib/supabase/config.ts`
   - `lib/supabase/auth.ts`
   - `lib/supabase/sadhana.ts`
   - `lib/supabase/users.ts`
   - `lib/supabase/messages.ts`

2. Restart TypeScript server in your IDE
3. Run `npm install` to ensure dependencies are installed

### Issue 8: Type Errors

**Error**: TypeScript errors about Supabase types

**Solution**:
1. Make sure `@supabase/supabase-js` is installed:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Restart TypeScript server
3. Check that types are imported correctly:
   ```typescript
   import { User as SupabaseUser } from '@supabase/supabase-js';
   ```

## Debugging Steps

1. **Check Supabase Dashboard**:
   - Go to your project dashboard
   - Check Logs for errors
   - Check Table Editor for data
   - Check Authentication > Users for registered users

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for error messages
   - Check Network tab for failed requests

3. **Check Environment Variables**:
   ```bash
   # In your terminal, check if variables are loaded
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

4. **Test Supabase Connection**:
   ```typescript
   // Add this temporarily to test
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   console.log('Supabase initialized:', !!supabase);
   ```

5. **Check Database Schema**:
   - Go to Supabase > Table Editor
   - Verify all tables exist: `users`, `sadhana_reports`, `messages`
   - Check table structure matches schema

## Getting Help

1. **Check Supabase Logs**:
   - Dashboard > Logs
   - Look for error messages

2. **Check Browser Network Tab**:
   - See exact request/response
   - Check error status codes
   - Look at response body for details

3. **Supabase Documentation**:
   - [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
   - [Supabase Database Docs](https://supabase.com/docs/guides/database)

4. **Community Support**:
   - [Supabase Discord](https://discord.supabase.com)
   - [Supabase GitHub](https://github.com/supabase/supabase)

## Quick Checklist

- [ ] Supabase project created
- [ ] Database schema SQL executed
- [ ] Environment variables set in `.env.local`
- [ ] Email authentication enabled
- [ ] Email confirmation disabled (for development)
- [ ] Dev server restarted after env changes
- [ ] Browser console checked for errors
- [ ] Supabase dashboard checked for logs
- [ ] Tables exist in Table Editor
- [ ] Users can be created in Authentication > Users

## Still Having Issues?

1. Share the exact error message
2. Share browser console errors
3. Share Supabase dashboard logs
4. Check if the issue is in development or production
5. Verify all steps in SUPABASE_MIGRATION_GUIDE.md were followed
