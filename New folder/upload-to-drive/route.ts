import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyIdToken } from '@/utils/firebase/admin'
import { getUserByFirebaseUid } from '@/utils/supabase/admin'
import { getAccessToken, findOrCreateFolder } from '@/utils/drive'

// Helper to determine file category based on MIME type and extension
function getFileCategory(fileName: string, mimeType: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''

    // PowerPoint
    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) {
        return 'ppt'
    }
    // PDF
    if (mimeType.includes('pdf') || extension === 'pdf') {
        return 'pdf'
    }
    // Excel/Spreadsheets
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
        return 'excel'
    }
    // Video
    if (mimeType.includes('video') || ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'mpeg', 'mpg'].includes(extension)) {
        return 'video'
    }
    // Audio/MP3
    if (mimeType.includes('audio') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(extension)) {
        return 'audio'
    }
    // Documents (Word, Text files)
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text') || ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
        return 'doc'
    }
    // ZIP/Archives
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive') || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
        return 'zip'
    }
    // Images
    if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'].includes(extension)) {
        return 'images'
    }

    return 'other'
}


export async function POST(request: NextRequest) {
    try {
        console.log('=== Token generation API called ===')

        // 1. Verify user is authenticated with Firebase
        const cookieStore = await cookies()
        const firebaseToken = cookieStore.get('firebase-token')?.value

        if (!firebaseToken) {
            console.error('No Firebase token found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify Firebase token
        const decodedToken = await verifyIdToken(firebaseToken)
        console.log('Firebase token verified for UID:', decodedToken.uid)

        // Get user profile from Supabase using firebase_uid
        const profile = await getUserByFirebaseUid(decodedToken.uid)

        if (!profile) {
            console.error('User profile not found in Supabase')
            return NextResponse.json({ error: 'User profile not found' }, { status: 401 })
        }

        console.log('User authenticated:', profile.id)

        // 2. Get file information from request body
        const body = await request.json()
        const { fileName, fileType } = body

        if (!fileName || !fileType) {
            return NextResponse.json({ error: 'File name and type required' }, { status: 400 })
        }

        // 3. Get user name from profile
        const userName = profile.full_name || profile.email?.split('@')[0] || profile.id.substring(0, 8)

        console.log('User name:', userName)

        // 4. Get access token
        console.log('Getting access token...')
        const accessToken = await getAccessToken()
        console.log('Access token obtained')

        const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID

        if (!mainFolderId) {
            console.error('MAIN_DRIVE_FOLDER_ID not set')
            return NextResponse.json({ error: 'Drive folder not configured' }, { status: 500 })
        }

        // 5. Create folder structure: Main → User Name → File Type
        console.log('Creating folder structure...')
        console.log(`Looking for user folder: "${userName}" in parent: ${mainFolderId}`)

        // Create or find user folder (with small delay to help with race conditions)
        await new Promise(resolve => setTimeout(resolve, 100))
        const userFolderId = await findOrCreateFolder(accessToken, userName, mainFolderId)
        console.log(`✓ User folder resolved: "${userName}" → ID: ${userFolderId}`)

        // Determine file category
        const fileCategory = getFileCategory(fileName, fileType)
        console.log(`File category for "${fileName}": ${fileCategory}`)
        console.log(`Looking for category folder: "${fileCategory}" in parent: ${userFolderId}`)

        // Create or find category folder (with small delay to help with race conditions)
        await new Promise(resolve => setTimeout(resolve, 100))
        const categoryFolderId = await findOrCreateFolder(accessToken, fileCategory, userFolderId)
        console.log(`✓ Category folder resolved: "${fileCategory}" → ID: ${categoryFolderId}`)

        console.log('=== Token generation complete ===')

        // Return the access token and target folder ID to the client
        return NextResponse.json({
            accessToken,
            folderId: categoryFolderId, // Upload to the category-specific folder
            userId: profile.id // Use Supabase user ID
        })

    } catch (error: any) {
        console.error('Token generation error:', error)
        console.error('Error stack:', error.stack)
        return NextResponse.json({ error: error.message || 'Token generation failed' }, { status: 500 })
    }
}
