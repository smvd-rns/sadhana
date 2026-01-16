import { NextResponse } from 'next/server';

// Google Drive API configuration
const FOLDER_ID = process.env.MAIN_DRIVE_FOLDER_ID || '19ahwFj8uoW0JXsQDsqXNf7GdWL35gxdg';

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

// Find or create folder by name in parent folder
async function findOrCreateFolder(drive: any, parentFolderId: string, folderName: string): Promise<string> {
  try {
    // Sanitize folder name (Google Drive folder names can contain most characters)
    const sanitizedFolderName = folderName.trim();
    
    if (!sanitizedFolderName) {
      throw new Error('Folder name cannot be empty');
    }

    // Search for existing folder with this name in the parent folder
    const searchQuery = `name='${sanitizedFolderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const searchResponse = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    // If folder exists, return its ID
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id;
    }

    // Folder doesn't exist, create it
    const folderMetadata = {
      name: sanitizedFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const createResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name',
    });

    if (!createResponse.data.id) {
      throw new Error(`Failed to create folder: ${sanitizedFolderName}`);
    }

    // Set folder permissions to allow access
    try {
      await drive.permissions.create({
        fileId: createResponse.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError: any) {
      console.warn(`Failed to set permissions for folder ${sanitizedFolderName}:`, permError.message);
    }

    return createResponse.data.id;
  } catch (error: any) {
    console.error(`Error finding/creating folder ${folderName}:`, error);
    throw new Error(`Failed to find or create folder: ${error.message}`);
  }
}

// Find or create nested folder structure (state/city/center)
async function getOrCreateFolderPath(drive: any, state: string, city: string, center: string): Promise<string> {
  let currentFolderId = FOLDER_ID;

  // Create or get state folder
  if (state) {
    currentFolderId = await findOrCreateFolder(drive, currentFolderId, state);
  }

  // Create or get city folder inside state
  if (city) {
    currentFolderId = await findOrCreateFolder(drive, currentFolderId, city);
  }

  // Create or get center folder inside city
  if (center) {
    currentFolderId = await findOrCreateFolder(drive, currentFolderId, center);
  }

  return currentFolderId;
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
      fields: 'id, name, webViewLink, webContentLink',
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file to Google Drive: No file ID returned');
    }

    // Make the file publicly viewable (optional, adjust based on your needs)
    try {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError: any) {
      // Log but don't fail if permission setting fails
      console.warn('Failed to set file permissions (file still uploaded):', permError.message);
    }

    // Construct the direct image URL for Google Drive files
    // Format: https://drive.google.com/uc?export=view&id=FILE_ID
    const directImageUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;
    
    // Return the file ID, view link, and direct image URL
    return JSON.stringify({
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      directImageUrl: directImageUrl, // Direct image URL for embedding
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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Sanitize user name for filename (remove special characters)
    const sanitizedName = userName
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
    
    // Create filename: username_timestamp.extension
    const timestamp = Date.now();
    const fileName = `${sanitizedName}_${timestamp}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get or create folder structure (state/city/center)
    let targetFolderId = FOLDER_ID; // Default to main folder if location not provided
    
    if (state && city && center) {
      try {
        const drive = await getDriveClient();
        targetFolderId = await getOrCreateFolderPath(drive, state, city, center);
        console.log(`Photo will be uploaded to folder structure: ${state}/${city}/${center} (ID: ${targetFolderId})`);
      } catch (folderError: any) {
        console.error('Error creating folder structure, using main folder:', folderError);
        // Continue with main folder if folder creation fails
      }
    } else {
      console.log('Location data not provided, uploading to main folder');
    }

    // Upload to Google Drive
    const driveResponse = await uploadToDrive(buffer, fileName, file.type, targetFolderId);

    return NextResponse.json({
      success: true,
      data: JSON.parse(driveResponse),
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
