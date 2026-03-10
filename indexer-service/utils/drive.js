import { createClient } from '@supabase/supabase-js';

export function extractFolderId(driveLink) {
    if (!driveLink) return null;

    if (!driveLink.includes('http') && !driveLink.includes('/')) {
        return driveLink;
    }

    const patterns = [
        /\/folders\/([a-zA-Z0-9-_]+)/,
        /[?&]id=([a-zA-Z0-9-_]+)/
    ];

    for (const pattern of patterns) {
        const match = driveLink.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

export async function getAccessToken() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Google Drive credentials');
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
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${data.error_description || 'Unknown error'}`);
        }

        return data.access_token;
    } catch (error) {
        throw new Error(`Failed to get access token: ${error.message}`);
    }
}

async function isScanCancelled(sadhanaDbAdmin, scanId) {
    try {
        const { data } = await sadhanaDbAdmin
            .from('drive_scans')
            .select('scan_status')
            .eq('id', scanId)
            .single();

        return data?.scan_status !== 'processing';
    } catch {
        return false;
    }
}

async function resolveFolderId(sadhanaDbAdmin, rootFolderId, path, userId, folderMap, localFolderCache) {
    if (!path) return rootFolderId;
    if (folderMap.has(path)) return folderMap.get(path);

    const segments = path.split('/');
    let currentParentId = rootFolderId;
    let currentPath = '';

    for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

        if (folderMap.has(currentPath)) {
            currentParentId = folderMap.get(currentPath);
            continue;
        }

        // Check local cache first
        const cacheKey = `${segment}:${currentParentId || 'root'}:${userId}`;
        if (localFolderCache.has(cacheKey)) {
            currentParentId = localFolderCache.get(cacheKey).id;
            folderMap.set(currentPath, currentParentId);
            continue;
        }

        const { data: existing } = await sadhanaDbAdmin
            .from('folders')
            .select('id')
            .eq('name', segment)
            .eq('user_id', userId)
            .is('parent_id', currentParentId === 'root' || !currentParentId ? null : currentParentId)
            .maybeSingle();

        if (existing) {
            currentParentId = existing.id;
            localFolderCache.set(cacheKey, { id: currentParentId });
        } else {
            const { data: created, error } = await sadhanaDbAdmin
                .from('folders')
                .insert({
                    name: segment,
                    parent_id: currentParentId === 'root' || !currentParentId ? null : currentParentId,
                    user_id: userId
                })
                .select()
                .single();

            if (!error && created) {
                currentParentId = created.id;
                localFolderCache.set(cacheKey, { id: currentParentId });
            }
        }

        if (currentParentId) {
            folderMap.set(currentPath, currentParentId);
        }
    }

    return currentParentId;
}

export async function scanFolderRecursively(folderId, accessToken, onProgress) {
    const allFiles = [];
    const processedFolders = new Set();
    let totalFoldersFound = 0;

    async function scanFolder(currentFolderId, currentPath = '') {
        if (processedFolders.has(currentFolderId)) return;
        processedFolders.add(currentFolderId);
        totalFoldersFound++;

        let pageToken = null;
        const folderFiles = [];
        const subfolders = [];

        try {
            do {
                const query = `'${currentFolderId}' in parents and trashed = false`;
                const requestUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,size,webViewLink,iconLink,thumbnailLink)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;

                const res = await fetch(requestUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(`Failed to list files: ${errorData.error?.message || 'Unknown error'}`);
                }

                const data = await res.json();
                const items = data.files || [];

                for (const item of items) {
                    if (item.mimeType === 'application/vnd.google-apps.folder') {
                        subfolders.push({
                            id: item.id,
                            name: item.name,
                            path: currentPath ? `${currentPath}/${item.name}` : item.name
                        });
                    } else {
                        folderFiles.push({
                            ...item,
                            folderPath: currentPath
                        });
                    }
                }

                pageToken = data.nextPageToken || null;
            } while (pageToken);

            allFiles.push(...folderFiles);

            if (onProgress) {
                onProgress(allFiles.length, totalFoldersFound);
            }

            // Parallel Subfolder Processing
            const CONCURRENCY_LIMIT = 5;
            const queue = [...subfolders];
            const activeWorkers = new Set();

            const processSubfolder = async (subfolder) => {
                try {
                    await scanFolder(subfolder.id, subfolder.path);
                } catch (err) {
                    console.error(`Error processing subfolder ${subfolder.name}:`, err.message);
                }
            };

            while (queue.length > 0 || activeWorkers.size > 0) {
                while (queue.length > 0 && activeWorkers.size < CONCURRENCY_LIMIT) {
                    const subfolder = queue.shift();
                    const promise = processSubfolder(subfolder).finally(() => {
                        activeWorkers.delete(promise);
                    });
                    activeWorkers.add(promise);
                }

                if (activeWorkers.size > 0) {
                    await Promise.race(activeWorkers);
                }
            }

        } catch (error) {
            console.error(`Error scanning folder ${currentFolderId}:`, error.message);
            throw error;
        }
    }

    await scanFolder(folderId);
    return { files: allFiles, foldersFound: totalFoldersFound };
}

export async function processAndSaveFiles({
    folderId, scanId, userId, displayName, sadhanaDbUrl, sadhanaDbKey
}) {
    console.log(`[Scan Worker ${scanId}] Booting via Render node process... Custom display name: ${displayName || 'None'}`);

    // Create DB instance exclusively for this worker to prevent pool exhausting
    const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbKey);

    try {
        const { data: scanRecord } = await sadhanaDbAdmin
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

        if (await isScanCancelled(sadhanaDbAdmin, scanId)) return;

        const scanResult = await scanFolderRecursively(folderId, accessToken, async (filesCount, foldersCount) => {
            filesFound = filesCount;
            foldersFound = foldersCount;

            if (await isScanCancelled(sadhanaDbAdmin, scanId)) throw new Error('Scan cancelled by user');

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
                console.error(`[Scan ${scanId}] Error updating progress:`, err.message);
            }
        });

        if (await isScanCancelled(sadhanaDbAdmin, scanId)) return;

        const files = scanResult.files;
        filesFound = files.length;
        foldersFound = scanResult.foldersFound;

        const BATCH_SIZE = 200; // Increased BATCH_SIZE for Render microservice
        const currentTime = new Date().toISOString();
        let lastProgressUpdate = Date.now();
        const folderIdMap = new Map();
        const localFolderCache = new Map();

        // Pre-fetch all user folders to seed the cache
        const { data: allUserFolders } = await sadhanaDbAdmin
            .from('folders')
            .select('id, name, parent_id')
            .eq('user_id', userId);

        if (allUserFolders) {
            allUserFolders.forEach(f => {
                const cacheKey = `${f.name}:${f.parent_id || 'root'}:${userId}`;
                localFolderCache.set(cacheKey, { id: f.id });
            });
        }

        let rootFolderIdForScan = null;
        if (displayName) {
            rootFolderIdForScan = await resolveFolderId(sadhanaDbAdmin, null, displayName, userId, folderIdMap, localFolderCache);
        }

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            if (await isScanCancelled(sadhanaDbAdmin, scanId)) break;

            const batch = files.slice(i, i + BATCH_SIZE);
            const batchFileNames = batch.map(f => f.name);

            try {
                const { data: existingFiles } = await sadhanaDbAdmin
                    .from('files')
                    .select('file_name')
                    .in('file_name', batchFileNames)
                    .eq('user_id', userId);

                const existingNameSet = new Set(existingFiles?.map(f => f.file_name) || []);
                const newFilesData = batch.filter(f => !existingNameSet.has(f.name));
                filesSkipped += (batch.length - newFilesData.length);

                if (newFilesData.length > 0) {
                    const filesToInsert = [];

                    for (const file of newFilesData) {
                        const targetFolderId = await resolveFolderId(sadhanaDbAdmin, rootFolderIdForScan, file.folderPath || '', userId, folderIdMap, localFolderCache);

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

                    const { error: insertError } = await sadhanaDbAdmin.from('files').insert(filesToInsert);

                    if (insertError) {
                        console.error('Batch insert error, trying individual');
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
                console.error(`[Scan ${scanId}] Error processing batch ${i}:`, batchError.message);
            }
        }

        console.log(`[Scan ${scanId}] Complete! Processed: ${filesProcessed}, Skipped: ${filesSkipped}`);

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

    } catch (error) {
        console.error(`[Scan ${scanId}] Fatal error:`, error.message);
        await sadhanaDbAdmin
            .from('drive_scans')
            .update({
                scan_status: 'failed',
                error_message: error.message || 'Unknown error occurred',
                completed_at: new Date().toISOString()
            })
            .eq('id', scanId);
    }
}
