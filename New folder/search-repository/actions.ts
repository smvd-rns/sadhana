'use server'

import { cookies } from 'next/headers'
import { verifyIdToken } from '@/utils/firebase/admin'
import { getUserByFirebaseUid } from '@/utils/supabase/admin'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client for database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Get all preachers (users with full_name) + manual names from drive scans for filter dropdown
export async function getAllPreachers() {
    try {
        // 1. Get all Active Uploaders directly using inner join
        // This avoids the 1000-row limit on 'files' table which was causing missing users
        const { data: uniqueUploaders, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, files!inner(id)')
            .not('full_name', 'is', null)
            .neq('full_name', '')
            .order('full_name', { ascending: true })

        if (usersError) console.error('Error fetching preachers (users):', usersError)

        // 2. Get all drive scan names (configured)
        const { data: scans, error: scansError } = await supabaseAdmin
            .from('drive_scans')
            .select('user_name')
            .neq('user_name', '')
            .not('user_name', 'is', null)

        if (scansError) console.error('Error fetching preachers (scans):', scansError)

        // 3. Get Active Manual Names (scan_user_name from files metadata)
        // Only fetch metadata for drive_scan uploads to reduce payload
        // We still need this for "manual" entries not linked to system users
        const { data: activeScanFiles, error: activeScanError } = await supabaseAdmin
            .from('files')
            .select('metadata')
            .eq('upload_method', 'drive_scan')

        if (activeScanError) console.error('Error fetching active scan files:', activeScanError)

        const activeScanNames = new Set<string>()

        // Add names from configured drive scans
        if (scans) {
            scans.forEach(s => {
                if (s.user_name) {
                    activeScanNames.add(s.user_name)
                }
            })
        }

        // Add names from actual metadata to catch any historical ones
        if (activeScanFiles) {
            activeScanFiles.forEach(f => {
                if (f.metadata && f.metadata.scan_user_name) {
                    activeScanNames.add(f.metadata.scan_user_name)
                }
            })
        }

        // Process users - Map to simple structure
        const preacherList: { id: string, full_name: string }[] = (uniqueUploaders || [])
            .map(u => ({
                id: u.id,
                full_name: u.full_name
            }))

        // Add manual names to the list
        activeScanNames.forEach(name => {
            // Avoid duplicates if a manual name exactly matches a real user's full name? 
            // For now, we keep them separate as requested (manual: prefix)
            preacherList.push({
                id: `manual:${name}`,
                full_name: `${name} (Drive Scan)`
            })
        })

        // Sort combined list alphabetically
        return preacherList.sort((a, b) => a.full_name.localeCompare(b.full_name))
    } catch (error) {
        console.error('Error fetching preachers:', error)
        return []
    }
}


// Helper function to build base query with filters
const applyFilters = (
    baseQuery: any,
    searchQuery: string,
    fileTypeFilter: string,
    preacherId: string,
    matchAny: boolean = false
) => {
    // Apply search filter
    if (searchQuery) {
        // Split search query into individual terms and filter out empty strings
        const terms = searchQuery.trim().split(/\s+/).filter(Boolean)

        if (matchAny) {
            // Build a single OR with all terms (match any term)
            const ors: string[] = []
            terms.forEach(term => {
                ors.push(`file_name.ilike.%${term}%`)
                ors.push(`metadata->>scan_description.ilike.%${term}%`)
                ors.push(`metadata->>description.ilike.%${term}%`)
            })
            if (ors.length > 0) baseQuery = baseQuery.or(ors.join(','))
        } else {
            // Apply each term as an AND condition - search in file_name, scan_description, and description
            terms.forEach(term => {
                baseQuery = baseQuery.or(`file_name.ilike.%${term}%,metadata->>scan_description.ilike.%${term}%,metadata->>description.ilike.%${term}%`)
            })
        }
    }

    // Apply preacher filter (filter by user_id OR scan_user_name)
    if (preacherId && preacherId !== 'all') {
        if (preacherId.startsWith('manual:')) {
            const manualName = preacherId.replace('manual:', '')
            baseQuery = baseQuery.eq('metadata->>scan_user_name', manualName)
        } else {
            baseQuery = baseQuery.eq('user_id', preacherId)
        }
    }

    // Apply file type filter
    if (fileTypeFilter && fileTypeFilter !== 'all') {
        if (fileTypeFilter === 'images') {
            baseQuery = baseQuery.ilike('file_type', 'image/%')
        } else if (fileTypeFilter === 'video') {
            baseQuery = baseQuery.ilike('file_type', 'video/%')
        } else if (fileTypeFilter === 'audio') {
            baseQuery = baseQuery.ilike('file_type', 'audio/%')
        } else if (fileTypeFilter === 'pdf') {
            baseQuery = baseQuery.ilike('file_type', '%pdf%')
        } else if (fileTypeFilter === 'excel') {
            baseQuery = baseQuery.or('file_type.ilike.%spreadsheet%,file_type.ilike.%excel%')
        } else if (fileTypeFilter === 'ppt') {
            // Match presentation/powerpoint types specifically
            baseQuery = baseQuery.or('file_type.ilike.%presentation%,file_type.ilike.%powerpoint%,file_type.ilike.%ms-powerpoint%,file_type.ilike.%officedocument.presentationml%')
        } else if (fileTypeFilter === 'doc') {
            // Match document/word/text types but exclude presentations
            // Use specific patterns: word, text, msword, wordprocessingml, and google-apps.document (but not presentation)
            baseQuery = baseQuery.or('file_type.ilike.%word%,file_type.ilike.%text%,file_type.ilike.%msword%,file_type.ilike.%officedocument.wordprocessingml%,file_type.ilike.%vnd.google-apps.document%')
                .not('file_type', 'ilike', '%presentation%')
                .not('file_type', 'ilike', '%powerpoint%')
        } else if (fileTypeFilter === 'zip') {
            baseQuery = baseQuery.or('file_type.ilike.%zip%,file_type.ilike.%compressed%,file_type.ilike.%archive%')
        }
    }

    return baseQuery
}


export async function getAllFilesPaginated(
    searchQuery: string = '',
    fileTypeFilter: string = '',
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'newest', // 'newest' | 'views'
    preacherId: string = '', // Filter by preacher (user_id)
    fetchCount: boolean = true, // Optional: skip count to speed up initial load
    matchAny: boolean = false // If true, match any term (OR). Default false = AND
) {
    // Verify Firebase authentication
    const cookieStore = await cookies()
    const firebaseToken = cookieStore.get('firebase-token')?.value

    if (!firebaseToken) {
        return { files: [], total: 0, totalPages: 0 }
    }

    let profile;
    try {
        const decodedToken = await verifyIdToken(firebaseToken)
        profile = await getUserByFirebaseUid(decodedToken.uid)
    } catch (authError: any) {
        console.error('❌ Authentication failed in search action:', authError.message || authError)
        return { files: [], total: 0, totalPages: 0, error: 'Authorization failed' }
    }

    if (!profile) {
        return { files: [], total: 0, totalPages: 0 }
    }

    // Check if user is approved
    if (profile.approval_status !== 'approved') {
        return { files: [], total: 0, totalPages: 0 }
    }

    // Get total count (Optional)
    let total = 0
    let countError = null

    if (fetchCount) {
        let countQuery = supabaseAdmin.from('files').select('id', { count: 'exact', head: true })
        countQuery = applyFilters(countQuery, searchQuery, fileTypeFilter, preacherId, matchAny)
        // Only select id for counting to be faster, though Supabase count option usually ignores selection
        // We already did .select('id') above, just need to await query or call .then
        // Actually, just await the query builder directly
        const { count, error } = await countQuery
        total = count || 0
        countError = error
        if (countError) console.error('Error counting files:', countError)
    }

    // Apply pagination and get data
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build fresh query for data
    let dataQuery = supabaseAdmin.from('files').select('*, users(full_name)', { count: 'exact' })
    dataQuery = applyFilters(dataQuery, searchQuery, fileTypeFilter, preacherId, matchAny)

    // Apply Sorting
    switch (sortBy) {
        case 'oldest':
            dataQuery = dataQuery.order('created_at', { ascending: true })
            break
        case 'views':
        case 'views_desc':
            dataQuery = dataQuery.order('views', { ascending: false }).order('created_at', { ascending: false })
            break
        case 'views_asc':
            dataQuery = dataQuery.order('views', { ascending: true }).order('created_at', { ascending: false })
            break
        case 'name_asc':
            dataQuery = dataQuery.order('file_name', { ascending: true })
            break
        case 'name_desc':
            dataQuery = dataQuery.order('file_name', { ascending: false })
            break
        case 'newest':
        default:
            dataQuery = dataQuery.order('created_at', { ascending: false })
            break
    }

    const { data, error } = await dataQuery.range(from, to)

    if (error) {
        console.error('Error fetching files:', error)
        return { files: [], total: 0, totalPages: 0 }
    }

    const totalPages = fetchCount ? Math.ceil(total / pageSize) : 0

    return {
        files: data || [],
        total,
        totalPages,
        currentPage: page,
        pageSize
    }
}

/**
 * Separate action to fetch just the count for cleaner UI loading
 */
export async function getRepositoryFileCount(
    searchQuery: string = '',
    fileTypeFilter: string = '',
    preacherId: string = ''
) {
    // Verify Firebase authentication
    const cookieStore = await cookies()
    const firebaseToken = cookieStore.get('firebase-token')?.value

    if (!firebaseToken) return { total: 0 }

    const decodedToken = await verifyIdToken(firebaseToken)
    let profile;
    try {
        profile = await getUserByFirebaseUid(decodedToken.uid)
    } catch (authError: any) {
        console.error('❌ Authentication failed in count action:', authError.message || authError)
        return { total: 0 }
    }

    if (!profile || profile.approval_status !== 'approved') return { total: 0 }

    let countQuery = supabaseAdmin.from('files').select('id', { count: 'exact', head: true })
    countQuery = applyFilters(countQuery, searchQuery, fileTypeFilter, preacherId)
    const { count, error } = await countQuery

    if (error) {
        console.error('Error fetching repository count:', error)
        return { total: 0 }
    }

    return { total: count || 0 }
}

// Action: Increment File View Count
export async function incrementFileView(fileId: string) {
    if (!fileId) return { success: false }

    // Use RPC if available for atomic increment, or just update
    // Simple update strategy for now:
    // Ideally we should use a Postgres function: increment_views(file_id)
    // But since we can't create functions easily without SQL access helper, we'll try a direct RPC call if it exists,
    // OR just use a raw update? Using rpc is safest for concurrency.

    // Attempting to call a hypothetical 'increment_file_views' rpc
    // If it fails, we fall back to: read -> write (not atomic but okay for MVP)

    try {
        const { error } = await supabaseAdmin.rpc('increment_file_views', { file_id: fileId })
        if (!error) return { success: true }
    } catch (e) {
        // Fallback or ignore
    }

    // Fallback: Read and Update (less safe but works without custom SQL function)
    const { data: file } = await supabaseAdmin.from('files').select('views').eq('id', fileId).single()
    if (file) {
        const newViews = (file.views || 0) + 1
        await supabaseAdmin.from('files').update({ views: newViews }).eq('id', fileId)
    }

    return { success: true }
}

/**
 * Get file statistics for public dashboard (approved users only)
 */
export async function getPublicFileStats() {
    try {
        // Authenticate the user
        const cookieStore = await cookies()
        const firebaseToken = cookieStore.get('firebase-token')?.value

        if (!firebaseToken) {
            throw new Error('Unauthorized')
        }

        const decodedToken = await verifyIdToken(firebaseToken)
        const profile = await getUserByFirebaseUid(decodedToken.uid)

        if (!profile || profile.approval_status !== 'approved') {
            throw new Error('Unauthorized')
        }

        // Fetch counts in parallel first
        const [
            totalResult,
            imagesResult,
            videosResult,
            documentsResult,
            directUploadResult,
            driveScanResult
        ] = await Promise.all([
            supabaseAdmin.from('files').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('files').select('id', { count: 'exact', head: true }).ilike('file_type', 'image/%'),
            supabaseAdmin.from('files').select('id', { count: 'exact', head: true }).ilike('file_type', 'video/%'),
            supabaseAdmin.from('files').select('id', { count: 'exact', head: true }).or('file_type.ilike.%pdf%,file_type.ilike.%word%,file_type.ilike.%text%'),
            supabaseAdmin.from('files').select('id', { count: 'exact', head: true }).eq('upload_method', 'direct_upload'),
            supabaseAdmin.from('files').select('id', { count: 'exact', head: true }).eq('upload_method', 'drive_scan')
        ])

        return {
            success: true,
            stats: {
                total: totalResult.count || 0,
                images: imagesResult.count || 0,
                videos: videosResult.count || 0,
                documents: documentsResult.count || 0,
                directUpload: directUploadResult.count || 0,
                driveScan: driveScanResult.count || 0,
                totalSize: 0 // Fetch lazily to improve performance
            }
        }
    } catch (error: any) {
        console.error('Error fetching public file stats:', error)
        return {
            success: false,
            error: error.message || 'Failed to fetch statistics',
            stats: {
                total: 0,
                images: 0,
                videos: 0,
                documents: 0,
                directUpload: 0,
                driveScan: 0,
                totalSize: 0
            }
        }
    }
}

/**
 * Lazily fetch total file size (heavy operation)
 */
export async function getTotalFileSize() {
    try {
        // Authenticate
        const cookieStore = await cookies()
        const firebaseToken = cookieStore.get('firebase-token')?.value
        if (!firebaseToken) throw new Error('Unauthorized')
        const decodedToken = await verifyIdToken(firebaseToken)
        const profile = await getUserByFirebaseUid(decodedToken.uid)
        if (!profile || profile.approval_status !== 'approved') throw new Error('Unauthorized')

        // Calculate total size
        // We still need to paginate because Supabase API limits rows, but we can optimize the selection
        // Actually, if we use a Postgres function it would be instant.
        // For now, we stick to the loop but isolated.

        const { count } = await supabaseAdmin.from('files').select('id', { count: 'exact', head: true })
        const totalCount = count || 0
        const pageSize = 1000
        const totalPages = Math.ceil(totalCount / pageSize)
        let totalSize = 0

        // Process in batches
        const batchSize = 5
        for (let i = 0; i < totalPages; i += batchSize) {
            const batchPromises = []
            for (let j = i; j < Math.min(i + batchSize, totalPages); j++) {
                batchPromises.push(
                    supabaseAdmin
                        .from('files')
                        .select('file_size')
                        .range(j * pageSize, (j + 1) * pageSize - 1)
                )
            }

            const batchResults = await Promise.all(batchPromises)
            batchResults.forEach(res => {
                if (res.data) {
                    totalSize += res.data.reduce((sum, file) => sum + (Number(file.file_size) || 0), 0)
                }
            })
        }

        return { success: true, totalSize }
    } catch (error) {
        console.error('Error fetching total size:', error)
        return { success: false, totalSize: 0 }
    }
}
