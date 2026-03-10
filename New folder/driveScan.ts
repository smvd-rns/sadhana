import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Get access token helper
async function getAccessToken() {
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
        totalFoldersFound++ // Count this folder

        let pageToken: string | null = null
        const folderFiles: any[] = []
        const subfolders: Array<{ id: string; name: string; path: string }> = []

        try {
            do {
                const query = `'${currentFolderId}' in parents and trashed = false`
                const requestUrl: string = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,size,webViewLink,iconLink)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`

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

            // Parallel processing for subfolders with concurrency limit
            const CONCURRENCY_LIMIT = 5
            const updateProgress = () => {
                if (onProgress) onProgress(allFiles.length, totalFoldersFound)
            }

            // Simple queue-based concurrency limiter
            const results = []
            const queue = [...subfolders]
            const activeWorkers = new Set()

            const processSubfolder = async (subfolder: { id: string, name: string, path: string }) => {
                try {
                    await scanFolder(subfolder.id, subfolder.path)
                } catch (err) {
                    console.error(`Error processing subfolder ${subfolder.name}:`, err)
                    // We continue even if one subfolder fails
                }
            }

            // Process queue
            while (queue.length > 0 || activeWorkers.size > 0) {
                while (queue.length > 0 && activeWorkers.size < CONCURRENCY_LIMIT) {
                    const subfolder = queue.shift()!
                    const promise = processSubfolder(subfolder).finally(() => {
                        activeWorkers.delete(promise)
                    })
                    activeWorkers.add(promise)
                }

                if (activeWorkers.size > 0) {
                    // Wait for at least one worker to finish before checking queue again
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

/**
 * Background function to scan folder and save files
 */
// Helper function to check if scan is cancelled
async function isScanCancelled(scanId: string): Promise<boolean> {
    try {
        const { data } = await supabaseAdmin
            .from('drive_scans')
            .select('scan_status')
            .eq('id', scanId)
            .single()

        return data?.scan_status !== 'processing'
    } catch {
        return false
    }
}

export async function scanFolderAndSave(folderId: string, scanId: string, userId: string) {
    console.log(`[Scan ${scanId}] Starting scan for folder ${folderId}`)

    try {
        // Fetch scan record to get user_name and description
        const { data: scanRecord, error: scanFetchError } = await supabaseAdmin
            .from('drive_scans')
            .select('user_name, description')
            .eq('id', scanId)
            .single()

        if (scanFetchError) {
            console.error(`[Scan ${scanId}] Error fetching scan record:`, scanFetchError)
        }

        const scanUserName = scanRecord?.user_name || null
        const scanDescription = scanRecord?.description || null

        console.log(`[Scan ${scanId}] Getting access token...`)
        const accessToken = await getAccessToken()
        console.log(`[Scan ${scanId}] Access token obtained successfully`)

        let filesFound = 0
        let foldersFound = 0
        let filesProcessed = 0
        let filesSkipped = 0

        // Check if scan was cancelled before starting
        if (await isScanCancelled(scanId)) {
            console.log(`Scan ${scanId} was cancelled, stopping.`)
            return
        }

        // Scan folder recursively
        const scanResult = await scanFolderRecursively(folderId, accessToken, async (filesCount, foldersCount) => {
            filesFound = filesCount
            foldersFound = foldersCount

            // Check for cancellation before updating progress
            if (await isScanCancelled(scanId)) {
                throw new Error('Scan cancelled by user')
            }

            // Update progress periodically
            try {
                const { error: updateError } = await supabaseAdmin
                    .from('drive_scans')
                    .update({
                        files_found: filesCount,
                        files_processed: filesProcessed,
                        metadata: { folders_found: foldersCount }
                    })
                    .eq('id', scanId)

                if (updateError) {
                    console.error(`[Scan ${scanId}] Error updating progress:`, updateError)
                }
            } catch (err) {
                console.error(`[Scan ${scanId}] Error updating progress:`, err)
            }
        })

        // Check again after scanning
        if (await isScanCancelled(scanId)) {
            console.log(`Scan ${scanId} was cancelled after scanning, stopping file processing.`)
            return
        }

        const files = scanResult.files
        filesFound = files.length
        foldersFound = scanResult.foldersFound

        // Process files in batches to optimize performance
        const BATCH_SIZE = 100
        const currentTime = new Date().toISOString()
        let lastProgressUpdate = Date.now()

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            // Check for cancellation before processing each batch
            if (await isScanCancelled(scanId)) {
                console.log(`Scan ${scanId} was cancelled, stopping file processing at file ${filesProcessed} of ${files.length}`)
                break // Will fall through to final update
            }

            const batch = files.slice(i, i + BATCH_SIZE)
            const batchFileNames = batch.map(f => f.name)

            try {
                // 1. Check for existing files in this batch by FILE NAME
                const { data: existingFiles, error: checkError } = await supabaseAdmin
                    .from('files')
                    .select('file_name')
                    .in('file_name', batchFileNames)

                if (checkError) {
                    console.error(`[Scan ${scanId}] Error checking existing files for batch ${i}-${i + BATCH_SIZE}:`, checkError)
                    throw checkError;
                }

                const existingNameSet = new Set(existingFiles?.map(f => f.file_name) || [])

                // 2. Filter new files (exclude if name exists)
                const newFiles = batch.filter(f => !existingNameSet.has(f.name))
                const duplicatesCount = batch.length - newFiles.length
                filesSkipped += duplicatesCount

                if (newFiles.length > 0) {
                    // 3. Prepare bulk insert data
                    const filesToInsert = newFiles.map(file => {
                        const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
                        return {
                            google_drive_id: file.id,
                            file_name: file.name,
                            file_type: file.mimeType || 'application/octet-stream',
                            file_size: file.size ? parseInt(file.size) : 0,
                            google_drive_url: driveUrl,
                            upload_method: 'drive_scan' as const,
                            user_id: userId,
                            points_awarded: 0, // No points for admin scans
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
                        }
                    })

                    // 4. Bulk insert with fallback
                    const { error: insertError } = await supabaseAdmin
                        .from('files')
                        .insert(filesToInsert)

                    if (insertError) {
                        console.error(`[Scan ${scanId}] Error bulk inserting batch ${i}. Falling back to individual inserts. Error:`, insertError)

                        // Fallback: Insert individually to handle race conditions or specific file errors
                        for (const fileData of filesToInsert) {
                            try {
                                const { error: singleError } = await supabaseAdmin
                                    .from('files')
                                    .insert(fileData)

                                if (singleError) {
                                    // If error is unique violation, count as skipped/duplicate
                                    if (singleError.code === '23505') {
                                        console.log(`[Scan ${scanId}] Skipping duplicate (race condition): ${fileData.file_name}`)
                                        filesSkipped++
                                    } else {
                                        console.error(`[Scan ${scanId}] Failed to save file ${fileData.file_name}:`, singleError)
                                    }
                                } else {
                                    filesProcessed++
                                }
                            } catch (err) {
                                console.error(`[Scan ${scanId}] Exception saving file ${fileData.file_name}:`, err)
                            }
                        }
                    } else {
                        filesProcessed += newFiles.length
                    }
                }

                // 5. Update progress if enough time has passed (every 2 seconds) or it's the last batch
                const now = Date.now()
                if (now - lastProgressUpdate > 2000 || i + BATCH_SIZE >= files.length) {
                    const { error: progressError } = await supabaseAdmin
                        .from('drive_scans')
                        .update({
                            files_found: filesFound,
                            files_processed: filesProcessed,
                            files_skipped: filesSkipped,
                            metadata: { folders_found: foldersFound }
                        })
                        .eq('id', scanId)

                    if (progressError) {
                        console.error(`[Scan ${scanId}] Error updating progress:`, progressError)
                    }
                    lastProgressUpdate = now
                }

            } catch (batchError) {
                console.error(`[Scan ${scanId}] Error processing batch ${i}:`, batchError)
                // Continue to next batch rather than failing entire scan
            }
        }

        // Mark scan as completed
        await supabaseAdmin
            .from('drive_scans')
            .update({
                scan_status: 'completed',
                files_found: filesFound,
                files_processed: filesProcessed,
                files_skipped: filesSkipped,
                metadata: { folders_found: foldersFound },
                completed_at: new Date().toISOString()
            })
            .eq('id', scanId)

        console.log(`[Scan ${scanId}] Scan completed successfully. Found: ${filesFound} files in ${foldersFound} folders, Processed: ${filesProcessed}, Skipped: ${filesSkipped} duplicates`)

    } catch (error: any) {
        console.error(`[Scan ${scanId}] Scan error:`, error)
        console.error(`[Scan ${scanId}] Error stack:`, error.stack)

        const { error: failError } = await supabaseAdmin
            .from('drive_scans')
            .update({
                scan_status: 'failed',
                error_message: error.message || 'Unknown error occurred',
                completed_at: new Date().toISOString()
            })
            .eq('id', scanId)

        if (failError) {
            console.error(`[Scan ${scanId}] Error marking scan as failed:`, failError)
        }

        throw error
    }
}
