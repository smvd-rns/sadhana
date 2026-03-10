import { createClient } from '@supabase/supabase-js'

// Connect to Secondary (Sadhana) Database
const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL!
const sadhanaDbServiceKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY!
const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbServiceKey)

// Connect to Primary Database (used only if we need user info from the primary DB, though auth usually handles this)
const primaryDbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const primaryDbServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const primaryDbAdmin = createClient(primaryDbUrl, primaryDbServiceKey)

// Get access token helper
export async function getAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
        const missing = []
        if (!clientId) missing.push('GOOGLE_CLIENT_ID')
        if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
        if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN')
        throw new Error(`Missing Google Drive credentials: ${missing.join(', ')}`)
    }

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Token refresh error:', data)
            throw new Error(`Failed to refresh token: ${data.error || data.error_description || 'Unknown error'}`)
        }

        return data.access_token
    } catch (error: any) {
        console.error('Error getting access token:', error)
        throw new Error(`Failed to get access token: ${error.message}`)
    }
}

/**
 * Extract folder ID from Google Drive URL
 */
export function extractFolderId(driveLink: string): string | null {
    if (!driveLink) return null

    if (!driveLink.includes('http') && !driveLink.includes('/')) {
        return driveLink
    }

    const patterns = [
        /\/folders\/([a-zA-Z0-9-_]+)/,
        /[?&]id=([a-zA-Z0-9-_]+)/
    ]

    for (const pattern of patterns) {
        const match = driveLink.match(pattern)
        if (match && match[1]) {
            return match[1]
        }
    }

    return null
}

/**
 * Recursively scan all files in a folder and its subfolders
 */
async function scanFolderRecursively(
    folderId: string,
    accessToken: string,
    onProgress?: (filesFound: number, foldersFound: number) => void
) {
    const allFiles: any[] = []
    const processedFolders = new Set<string>()
    let totalFoldersFound = 0

    async function scanFolder(currentFolderId: string, currentPath: string = '') {
        if (processedFolders.has(currentFolderId)) {
            console.log(`Skipping already processed folder: ${currentFolderId}`)
            return
        }
        processedFolders.add(currentFolderId)
        totalFoldersFound++

        let pageToken: string | null = null
        const folderFiles: any[] = []
        const subfolders: Array<{ id: string; name: string; path: string }> = []

        try {
            do {
                const query = `'${currentFolderId}' in parents and trashed = false`
                const requestUrl: string = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,size,webViewLink,iconLink,thumbnailLink)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`

                const res = await fetch(requestUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                })

                if (!res.ok) {
                    const errorData = await res.json()
                    throw new Error(`Failed to list files: ${errorData.error?.message || 'Unknown error'}`)
                }

                const data = await res.json()
                const items = data.files || []

                for (const item of items) {
                    if (item.mimeType === 'application/vnd.google-apps.folder') {
                        subfolders.push({
                            id: item.id,
                            name: item.name,
                            path: currentPath ? `${currentPath}/${item.name}` : item.name
                        })
                    } else {
                        folderFiles.push({
                            ...item,
                            folderPath: currentPath
                        })
                    }
                }

                pageToken = data.nextPageToken || null
            } while (pageToken)

            allFiles.push(...folderFiles)

            if (onProgress) {
                onProgress(allFiles.length, totalFoldersFound)
            }

            // Parallel processing for subfolders
            const CONCURRENCY_LIMIT = 5
            const results = []
            const queue = [...subfolders]
            const activeWorkers = new Set()

            const processSubfolder = async (subfolder: { id: string, name: string, path: string }) => {
                try {
                    await scanFolder(subfolder.id, subfolder.path)
                } catch (err) {
                    console.error(`Error processing subfolder ${subfolder.name}:`, err)
                }
            }

            while (queue.length > 0 || activeWorkers.size > 0) {
                while (queue.length > 0 && activeWorkers.size < CONCURRENCY_LIMIT) {
                    const subfolder = queue.shift()!
                    const promise = processSubfolder(subfolder).finally(() => {
                        activeWorkers.delete(promise)
                    })
                    activeWorkers.add(promise)
                }

                if (activeWorkers.size > 0) {
                    await Promise.race(activeWorkers)
                }
            }

        } catch (error: any) {
            console.error(`Error scanning folder ${currentFolderId}:`, error.message)
            throw error
        }
    }

    await scanFolder(folderId)
    console.log(`Recursive scan complete. Found ${allFiles.length} files in ${totalFoldersFound} folders.`)
    return { files: allFiles, foldersFound: totalFoldersFound }
}

async function isScanCancelled(scanId: string): Promise<boolean> {
    try {
        const { data } = await sadhanaDbAdmin
            .from('drive_scans')
            .select('scan_status')
            .eq('id', scanId)
            .single()

        return data?.scan_status !== 'processing'
    } catch {
        return false
    }
}

/**
 * Helper to get or create a folder hierarchy in the database
 */
async function resolveFolderId(
    rootFolderId: string | null,
    path: string,
    userId: string,
    folderMap: Map<string, string>
): Promise<string | null> {
    if (!path) return rootFolderId;
    if (folderMap.has(path)) return folderMap.get(path)!;

    const segments = path.split('/');
    let currentParentId = rootFolderId;
    let currentPath = '';

    for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

        if (folderMap.has(currentPath)) {
            currentParentId = folderMap.get(currentPath)!;
            continue;
        }

        // Try to find existing folder
        const { data: existing } = await sadhanaDbAdmin
            .from('folders')
            .select('id')
            .eq('name', segment)
            .eq('user_id', userId)
            .is('parent_id', currentParentId === 'root' || !currentParentId ? null : currentParentId)
            .maybeSingle();

        if (existing) {
            currentParentId = existing.id;
        } else {
            // Create new folder
            const { data: created, error } = await sadhanaDbAdmin
                .from('folders')
                .insert({
                    name: segment,
                    parent_id: currentParentId === 'root' || !currentParentId ? null : currentParentId,
                    user_id: userId
                })
                .select()
                .single();

            if (error) {
                console.error(`Error creating folder ${segment}:`, error);
                // Fallback to parent?
            } else {
                currentParentId = created.id;
            }
        }

        if (currentParentId) {
            folderMap.set(currentPath, currentParentId);
        }
    }

    return currentParentId;
}

export async function scanFolderAndSave(folderId: string, scanId: string, userId: string, displayName?: string) {
    console.log(`[Scan ${scanId}] Starting scan for folder ${folderId} (Custom Root: ${displayName || 'None'})`);

    try {
        // Fetch scan record from Secondary DB
        const { data: scanRecord, error: scanFetchError } = await sadhanaDbAdmin
            .from('drive_scans')
            .select('user_name, description')
            .eq('id', scanId)
            .single();

        const scanUserName = scanRecord?.user_name || null;
        const scanDescription = scanRecord?.description || null;

        console.log(`[Scan ${scanId}] Getting access token...`);
        const accessToken = await getAccessToken();

        let filesFound = 0;
        let foldersFound = 0;
        let filesProcessed = 0;
        let filesSkipped = 0;

        if (await isScanCancelled(scanId)) {
            console.log(`Scan ${scanId} was cancelled, stopping.`);
            return;
        }

        const scanResult = await scanFolderRecursively(folderId, accessToken, async (filesCount, foldersCount) => {
            filesFound = filesCount;
            foldersFound = foldersCount;

            if (await isScanCancelled(scanId)) {
                throw new Error('Scan cancelled by user');
            }

            try {
                await sadhanaDbAdmin
                    .from('drive_scans')
                    .update({
                        files_found: filesCount,
                        files_processed: filesProcessed,
                        metadata: { folders_found: foldersCount }
                    })
                    .eq('id', scanId);
            } catch (err) {
                console.error(`[Scan ${scanId}] Error updating progress:`, err);
            }
        });

        if (await isScanCancelled(scanId)) {
            console.log(`Scan ${scanId} was cancelled after scanning.`);
            return;
        }

        const files = scanResult.files;
        filesFound = files.length;
        foldersFound = scanResult.foldersFound;

        const BATCH_SIZE = 50; // Smaller batch size due to folder resolution
        const currentTime = new Date().toISOString();
        let lastProgressUpdate = Date.now();
        const folderIdMap = new Map<string, string>();

        // Create or resolve the custom display name folder if provided
        let rootFolderIdForScan: string | null = null;
        if (displayName) {
            console.log(`[Scan ${scanId}] Resolving custom root folder: ${displayName}`);
            rootFolderIdForScan = await resolveFolderId(null, displayName, userId, folderIdMap);
        }

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            if (await isScanCancelled(scanId)) {
                break;
            }

            const batch = files.slice(i, i + BATCH_SIZE);
            const batchFileNames = batch.map(f => f.name);

            try {
                // Secondary DB files table check
                const { data: existingFiles, error: checkError } = await sadhanaDbAdmin
                    .from('files')
                    .select('file_name')
                    .in('file_name', batchFileNames);

                if (checkError) throw checkError;

                const existingNameSet = new Set(existingFiles?.map(f => f.file_name) || []);
                const newFilesData = batch.filter(f => !existingNameSet.has(f.name));
                filesSkipped += (batch.length - newFilesData.length);

                if (newFilesData.length > 0) {
                    const filesToInsert = [];

                    for (const file of newFilesData) {
                        // Resolve folder ID for this file's path, starting from our custom root if it exists
                        const targetFolderId = await resolveFolderId(rootFolderIdForScan, file.folderPath || '', userId, folderIdMap);

                        // Infer category roughly the same as upload uses
                        const mimeType = file.mimeType || '';
                        const extension = file.name.split('.').pop()?.toLowerCase() || '';
                        let category = 'other';
                        if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) category = 'ppt';
                        else if (mimeType.includes('pdf') || extension === 'pdf') category = 'pdf';
                        else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx'].includes(extension)) category = 'excel';
                        else if (mimeType.includes('video') || ['mp4', 'avi', 'mov'].includes(extension)) category = 'video';
                        else if (mimeType.includes('audio') || ['mp3', 'wav'].includes(extension)) category = 'audio';
                        else if (mimeType.includes('document') || mimeType.includes('word') || ['doc', 'docx'].includes(extension)) category = 'doc';
                        else if (mimeType.includes('image') || ['jpg', 'jpeg', 'png'].includes(extension)) category = 'images';

                        const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

                        filesToInsert.push({
                            google_drive_id: file.id,
                            file_name: file.name,
                            file_type: file.mimeType || 'application/octet-stream',
                            file_size: file.size ? parseInt(file.size) : 0,
                            google_drive_url: driveUrl,
                            thumbnail_link: file.thumbnailLink,
                            category: category,
                            description: scanDescription,
                            upload_method: 'drive_scan',
                            user_id: userId,
                            folder_id: targetFolderId,
                            points_awarded: 0,
                            created_at: currentTime,
                            updated_at: currentTime,
                            views: 0,
                            metadata: {
                                iconLink: file.iconLink,
                                folderPath: file.folderPath || '',
                                scan_user_name: scanUserName,
                                scan_description: scanDescription,
                                scan_id: scanId
                            }
                        });
                    }

                    const { error: insertError } = await sadhanaDbAdmin
                        .from('files')
                        .insert(filesToInsert);

                    if (insertError) {
                        console.error('Batch insert error, trying individual:', insertError);
                        for (const fileData of filesToInsert) {
                            const { error: singleError } = await sadhanaDbAdmin.from('files').insert(fileData);
                            if (singleError && singleError.code === '23505') filesSkipped++;
                            else if (!singleError) filesProcessed++;
                        }
                    } else {
                        filesProcessed += newFilesData.length;
                    }
                }

                const now = Date.now();
                if (now - lastProgressUpdate > 2000 || i + BATCH_SIZE >= files.length) {
                    await sadhanaDbAdmin
                        .from('drive_scans')
                        .update({
                            files_found: filesFound,
                            files_processed: filesProcessed,
                            files_skipped: filesSkipped,
                            metadata: { folders_found: foldersFound }
                        })
                        .eq('id', scanId);
                    lastProgressUpdate = now;
                }
            } catch (batchError) {
                console.error(`[Scan ${scanId}] Error processing batch ${i}:`, batchError);
            }
        }

        await sadhanaDbAdmin
            .from('drive_scans')
            .update({
                scan_status: 'completed',
                files_found: filesFound,
                files_processed: filesProcessed,
                files_skipped: filesSkipped,
                completed_at: new Date().toISOString()
            })
            .eq('id', scanId);

    } catch (error: any) {
        console.error(`[Scan ${scanId}] Fatal error:`, error);
        await sadhanaDbAdmin
            .from('drive_scans')
            .update({
                scan_status: 'failed',
                error_message: error.message || 'Unknown error occurred',
                completed_at: new Date().toISOString()
            })
            .eq('id', scanId);
        throw error;
    }
}
