// Helper to get a fresh Access Token using the Refresh Token
export async function getAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Google Drive credentials in server environment.')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Failed to refresh token:', data);
        throw new Error(`Failed to refresh Google Access Token: ${data.error_description || data.error}`);
    }

    return data.access_token;
}

// Helper to find or create a folder in Google Drive with Robust Race Condition Handling
export async function findOrCreateFolder(accessToken: string, folderName: string, parentFolderId: string): Promise<string> {
    const maxRetries = 3
    let retryCount = 0

    // Explicitly ask for createdTime to determine the oldest folder
    const fields = 'files(id, name, createdTime)'

    while (retryCount < maxRetries) {
        const escapedFolderName = folderName
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')

        const query = `name='${escapedFolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        // Sort by createdTime ascending to pick the oldest
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime asc`

        // 1. Initial Search
        const searchRes = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        })

        if (searchRes.ok) {
            const searchData = await searchRes.json()
            if (searchData.files && searchData.files.length > 0) {
                const exactMatches = searchData.files.filter((f: any) => f.name === folderName);
                if (exactMatches.length > 0) {
                    console.log(`✓ Found existing folder: "${folderName}" (ID: ${exactMatches[0].id})`)
                    return exactMatches[0].id
                }
            }
        }

        // 2. Create Folder
        console.log(`Creating new folder: "${folderName}" (attempt ${retryCount + 1})`)
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId]
            })
        })

        if (createRes.ok) {
            const newFolder = await createRes.json()
            const newFolderId = newFolder.id;
            console.log(`✓ Created new folder: "${folderName}" (ID: ${newFolderId})`)

            const validationRes = await fetch(searchUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            if (validationRes.ok) {
                const validationData = await validationRes.json();
                if (validationData.files && validationData.files.length > 1) {
                    console.warn(`⚠ Race condition detected! Multiple folders found for "${folderName}". Converging to oldest.`);
                    const exactMatches = validationData.files.filter((f: any) => f.name === folderName);
                    const oldestFolder = exactMatches[0];

                    if (oldestFolder && oldestFolder.id !== newFolderId) {
                        console.log(`↺ Switching from new ID ${newFolderId} to oldest ID ${oldestFolder.id}`);
                        return oldestFolder.id;
                    }
                }
            }

            return newFolderId
        }

        const errorData = await createRes.json().catch(() => ({ error: { message: 'Unknown error' } }))

        if (createRes.status === 409 || errorData.error?.message?.toLowerCase().includes('duplicate')) {
            console.log(`Folder creation conflict for "${folderName}", retrying...`)
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 300 * retryCount))
            continue
        }

        console.error(`Failed to create folder "${folderName}":`, errorData);
        retryCount++
    }

    throw new Error(`Failed to find or create folder "${folderName}" after ${maxRetries} attempts`)
}

// Full initialization for a new user
export async function initializeUserDriveFolders(userName: string) {
    console.log(`Initializing full Drive folder structure for user: ${userName}`);

    try {
        const accessToken = await getAccessToken();
        // Hardcoded as specifically requested by user, overriding .env
        const mainFolderId = '1KhZ2l4wk3HXwBhX18JFb10zNvWJNMjHi';

        // 1. Create/Find User Folder
        const userFolderId = await findOrCreateFolder(accessToken, userName, mainFolderId);
        console.log(`User Root Folder ID: ${userFolderId}`);

        // 2. Create All Categories
        const categories = ['ppt', 'pdf', 'excel', 'video', 'audio', 'doc', 'zip', 'images', 'other'];

        await Promise.all(categories.map(async (category) => {
            await findOrCreateFolder(accessToken, category, userFolderId);
            console.log(`  └─ Category ensured: ${category}`);
        }));

        console.log('✓ All folders initialized successfully.');
        return true;
    } catch (error) {
        console.error('Failed to initialize user folders:', error);
        throw error;
    }
}
