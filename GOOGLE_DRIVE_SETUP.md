# Google Drive Photo Upload Setup Guide

This guide explains how to set up Google Drive API integration for user photo uploads using OAuth 2.0.

## Prerequisites

1. A Google Cloud Project
2. Google Drive API enabled
3. OAuth 2.0 credentials (Client ID, Client Secret, Refresh Token)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/drive.file`
   - Add test users if needed
   - Save and continue
4. For OAuth client:
   - **Application type**: Choose **Desktop app** or **Web application**
   - **Name**: `ISKCON Photo Upload`
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**

## Step 4: Generate Refresh Token

You need to generate a refresh token using the OAuth 2.0 flow. Here's a quick way:

### Option A: Using OAuth 2.0 Playground (Easiest)

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your **Client ID** and **Client Secret**
5. In the left panel, find "Drive API v3"
6. Select scope: `https://www.googleapis.com/auth/drive.file`
7. Click "Authorize APIs"
8. Sign in and grant permissions
9. Click "Exchange authorization code for tokens"
10. Copy the **Refresh token**

### Option B: Using a Script

Create a temporary script to generate the refresh token:

```javascript
// generate-refresh-token.js
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/oauth2callback'
);

const scopes = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
  });
});
```

Run: `node generate-refresh-token.js`

## Step 5: Add Environment Variables

Add these to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
MAIN_DRIVE_FOLDER_ID=19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg
```

## Step 6: Install Google APIs Package

```bash
npm install googleapis
```

## Step 7: Verify Folder Access

1. Open the Google Drive folder: https://drive.google.com/drive/u/5/folders/19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg
2. Ensure the Google account associated with the OAuth credentials has access to this folder
3. The account should have **Editor** or **Owner** permissions

## Step 8: Test the Upload

1. Start your development server
2. Go to the registration page
3. Try uploading a photo
4. Check the Google Drive folder to verify the file was uploaded

## Troubleshooting

### Error: "Google Drive OAuth credentials not configured"
- Check that all three environment variables are set: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- Restart your development server after adding environment variables

### Error: "invalid_grant" or "Token has been expired or revoked"
- Your refresh token may have expired or been revoked
- Generate a new refresh token using the OAuth 2.0 Playground or script
- Update `GOOGLE_REFRESH_TOKEN` in `.env.local`

### Error: "Permission denied" or "File not found"
- Ensure the Google account has access to the folder
- Verify the `MAIN_DRIVE_FOLDER_ID` is correct
- Check that the folder ID matches: `19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg`

### Files not appearing in Drive
- Check server logs for detailed error messages
- Verify the OAuth scopes include `https://www.googleapis.com/auth/drive.file`
- Ensure the refresh token has the correct permissions

## Security Notes

1. **Never commit** `.env.local` to version control
2. Add `.env.local` to `.gitignore`
3. Use environment variables in production (Vercel, Netlify, etc.)
4. Refresh tokens don't expire unless revoked, but keep them secure
5. Consider rotating refresh tokens periodically

## File Naming Convention

Photos are automatically renamed using this format:
- Format: `{sanitized_username}_{timestamp}.{extension}`
- Example: `john_doe_1703123456789.jpg`
- Special characters are removed and spaces replaced with underscores

## Step 10: Test the Upload

1. Start your development server
2. Go to the registration page
3. Try uploading a photo
4. Check the Google Drive folder to verify the file was uploaded

## Troubleshooting

### Error: "Google Drive credentials not configured"
- Check that environment variables are set correctly
- Restart your development server after adding environment variables

### Error: "Permission denied"
- Ensure the service account email has Editor access to the Google Drive folder
- Verify the folder ID is correct

### Error: "Invalid credentials"
- Check that the private key includes all `\n` characters
- Ensure the private key is properly quoted in `.env.local`

### Files not appearing in Drive
- Check the folder permissions
- Verify the service account has access
- Check server logs for detailed error messages

## Security Notes

1. **Never commit** the service account JSON file or `.env.local` to version control
2. Add `.env.local` to `.gitignore`
3. Use environment variables in production (Vercel, Netlify, etc.)
4. Consider restricting the service account to only the specific folder
5. Regularly rotate service account keys

## File Naming Convention

Photos are automatically renamed using this format:
- Format: `{sanitized_username}_{timestamp}.{extension}`
- Example: `john_doe_1703123456789.jpg`
- Special characters are removed and spaces replaced with underscores
