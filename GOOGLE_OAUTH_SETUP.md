# Google OAuth Setup Guide

## Step-by-Step Configuration

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add **Authorized redirect URIs**:
   ```
   https://mocqaynjunnddhsbwduq.supabase.co/auth/v1/callback
   ```
   ⚠️ **Important**: This is your Supabase project's callback URL, NOT your app's URL
7. Save and copy your **Client ID** and **Client Secret**

### 2. Supabase Dashboard Setup

#### Step 2a: Configure Site URL (IMPORTANT!)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to:
   ```
   http://localhost:3000
   ```
   (For production, use: `https://yourdomain.com`)
5. Add **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```
   (For production, add: `https://yourdomain.com/auth/callback` and `https://yourdomain.com/**`)
6. Click **Save**

#### Step 2b: Enable Google Provider

1. Still in Supabase Dashboard, navigate to **Authentication** → **Providers**
2. Find **Google** and toggle it **ON**
3. Enter your Google credentials:
   - **Client ID (for OAuth)**: Paste from Google Cloud Console
   - **Client Secret (for OAuth)**: Paste from Google Cloud Console
4. Click **Save**

⚠️ **Note**: The Redirect URL field in the Google provider settings is optional when using Supabase's OAuth flow. The Site URL and Redirect URLs from Step 2a are what matter.

### 3. Verify Configuration

The OAuth flow works like this:
1. User clicks "Sign in with Google"
2. Redirects to Google for authentication
3. Google redirects to: `https://mocqaynjunnddhsbwduq.supabase.co/auth/v1/callback`
4. Supabase processes the OAuth and redirects to: `http://localhost:3000/auth/callback`
5. Your app's callback handler creates the user session

### Common Issues

#### Error: "redirect_uri_mismatch"
- **Solution**: Make sure `https://mocqaynjunnddhsbwduq.supabase.co/auth/v1/callback` is added to Google Cloud Console's authorized redirect URIs

#### Error: "Failed to sign in with Google"
- Check Supabase dashboard → Authentication → Providers → Google is enabled
- Verify Client ID and Client Secret are correct
- Check browser console for detailed error messages

#### Error: "No authorization code received"
- **Most Common Cause**: Site URL not configured in Supabase
- **Solution**: 
  1. Go to Supabase Dashboard → Authentication → URL Configuration
  2. Set Site URL to `http://localhost:3000` (or your production URL)
  3. Add `http://localhost:3000/auth/callback` to Redirect URLs
  4. Save and try again
- The redirect might not be completing properly if Site URL is missing
- Check browser console and network tab to see if the callback is being hit

### Testing

1. Try signing in with Google
2. Check browser console for any errors
3. Check Supabase logs: Dashboard → Logs → Auth Logs
