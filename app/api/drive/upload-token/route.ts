import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/supabase/admin'
import { getUserData } from '@/lib/supabase/auth'
import { getAccessToken, findOrCreateFolder } from '@/lib/utils/drive'
import sadhanaDb from '@/lib/supabase/sadhanaDb'

export const maxDuration = 60;

// Helper to determine file category based on MIME type and extension
function getFileCategory(fileName: string, mimeType: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''

    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) return 'ppt'
    if (mimeType.includes('pdf') || extension === 'pdf') return 'pdf'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return 'excel'
    if (mimeType.includes('video') || ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'mpeg', 'mpg'].includes(extension)) return 'video'
    if (mimeType.includes('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(extension)) return 'audio'
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text') || ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) return 'doc'
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive') || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) return 'zip'
    if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'].includes(extension)) return 'images'

    return 'other'
}

export async function POST(request: NextRequest) {
    try {
        console.log('=== Token generation API called ===')

        // 1. Verify user is authenticated with Supabase
        const user = await getAuthUserFromRequest(request as any)

        if (!user) {
            console.error('No valid authorization token found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const profile = await getUserData(user.id)

        if (!profile) {
            console.error('User profile not found in Supabase')
            return NextResponse.json({ error: 'User profile not found' }, { status: 401 })
        }

        // 2. Get file information from request body
        const body = await request.json()
        const { fileName, fileType, targetFolderId } = body

        if (!fileName || !fileType) {
            return NextResponse.json({ error: 'File name and type required' }, { status: 400 })
        }

        const accessToken = await getAccessToken()
        const mainFolderId = '1KhZ2l4wk3HXwBhX18JFb10zNvWJNMjHi'
        let finalFolderId = ''

        // 3. Resolve Folder ID
        if (targetFolderId && targetFolderId !== 'root') {
            // Fetch the Google Drive ID for the selected folder
            if (!sadhanaDb) throw new Error('Database connection failed')

            const { data: folderData, error } = await sadhanaDb
                .from('folders')
                .select('google_drive_folder_id')
                .eq('id', targetFolderId)
                .single()

            if (error || !folderData?.google_drive_folder_id) {
                console.warn('Target folder not found in Drive, falling back to default')
            } else {
                finalFolderId = folderData.google_drive_folder_id
            }
        }

        // 4. Default Category-based Organization
        if (!finalFolderId) {
            const userName = profile.name || profile.email?.split('@')[0] || profile.id.substring(0, 8)
            const userFolderId = await findOrCreateFolder(accessToken, userName, mainFolderId)
            const fileCategory = getFileCategory(fileName, fileType)
            finalFolderId = await findOrCreateFolder(accessToken, fileCategory, userFolderId)
        }

        console.log('=== Token generation complete ===')

        return NextResponse.json({
            accessToken,
            folderId: finalFolderId,
            userId: profile.id
        })

    } catch (error: any) {
        console.error('Token generation error:', error)
        return NextResponse.json({ error: error.message || 'Token generation failed' }, { status: 500 })
    }
}
