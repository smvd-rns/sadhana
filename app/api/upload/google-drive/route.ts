import { NextResponse } from 'next/server';

// Google Drive API configuration
const FOLDER_ID = process.env.MAIN_DRIVE_FOLDER_ID || '1yYUuXJsiLr2TbRHIUfEWjUuoukQ6XFEe';

// Initialize Google Drive API using OAuth 2.0
async function getDriveClient() {
  // Check if googleapis is installed
  let google;
  try {
    google = require('googleapis').google;
  } catch (error) {
    throw new Error('googleapis package not installed. Please run: npm install googleapis');
  }

  // Get OAuth credentials from environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in environment variables.');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob' // Redirect URI (not used for refresh token flow)
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Create Drive client with OAuth2
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return drive;
}


// Upload file to Google Drive
async function uploadToDrive(fileBuffer: Buffer, fileName: string, mimeType: string, targetFolderId: string): Promise<string> {
  try {
    const drive = await getDriveClient();

    // Create file metadata
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId], // Upload to the specified folder
    };

    // Convert buffer to stream for Google Drive API
    // Create a proper Readable stream from the buffer
    const { Readable } = require('stream');
    const stream = new Readable({
      read() {
        this.push(fileBuffer);
        this.push(null); // End the stream
      }
    });

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file to Google Drive: No file ID returned');
    }

    // Make the file publicly viewable (optional, adjust based on your needs)
    try {
      const permRes = await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log('Permission set result:', permRes.status);
    } catch (permError: any) {
      // Log but don't fail if permission setting fails
      console.warn('Failed to set file permissions (file still uploaded):', permError.message);
    }

    // Construct the direct image URL for Google Drive files
    // Use standard view link as primary, assuming permissions are set correctly
    const directImageUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;

    // Note: We're not using thumbnailLink as primary anymore because lh3 links were failing
    // But we keep it in the response below in case we need to switch back or use it for other purposes

    // Return the file ID, view link, and direct image URL
    return JSON.stringify({
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      thumbnailLink: response.data.thumbnailLink,
      directImageUrl: directImageUrl, // High-res thumbnail or standard view link
    });
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userName = formData.get('userName') as string;
    const state = formData.get('state') as string;
    const city = formData.get('city') as string;
    const center = formData.get('center') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userName) {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 });
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.' }, { status: 400 });
    }

    // File size check removed as per requirement (unlimited uploads)

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Sanitize user name for filename (remove special characters)
    const sanitizedName = userName
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();

    // Create filename: Name_Date.extension
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${sanitizedName}_${dateString}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload directly to the main folder
    // No more subfolders for State/City/Center
    const targetFolderId = FOLDER_ID;
    // Upload to Google Drive
    const driveResponse = await uploadToDrive(buffer, fileName, file.type, targetFolderId);

    return NextResponse.json({
      success: true,
      data: {
        ...JSON.parse(driveResponse),
        uploadedToFolderId: targetFolderId, // Return folder ID for debugging
      }
    });
  } catch (error: any) {
    console.error('Error in Google Drive upload:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to upload file to Google Drive',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
