import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyIdToken } from '@/utils/firebase/admin'
import { getUserByFirebaseUid } from '@/utils/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { extractFolderId, scanFolderAndSave } from '@/utils/driveScan'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// POST - Start a Drive folder scan (admin only)
export async function POST(request: NextRequest) {
    try {
        // Verify Firebase authentication
        const cookieStore = await cookies()
        const firebaseToken = cookieStore.get('firebase-token')?.value

        if (!firebaseToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decodedToken = await verifyIdToken(firebaseToken)
        const profile = await getUserByFirebaseUid(decodedToken.uid)

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { driveLink } = body

        if (!driveLink) {
            return NextResponse.json({ error: 'Drive link is required' }, { status: 400 })
        }

        // Extract folder ID from the link
        const folderId = extractFolderId(driveLink.trim())
        if (!folderId) {
            return NextResponse.json({ error: 'Invalid Drive folder link. Please provide a valid Google Drive folder URL.' }, { status: 400 })
        }

        // Create scan record
        const { data: scanRecord, error: scanError } = await supabaseAdmin
            .from('drive_scans')
            .insert({
                user_id: profile.id,
                drive_link: driveLink,
                scan_status: 'processing',
                started_at: new Date().toISOString()
            })
            .select()
            .single()

        if (scanError || !scanRecord) {
            console.error('Error creating scan record:', scanError)
            return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 })
        }

        // Start scanning in the background (don't await)
        scanFolderAndSave(folderId, scanRecord.id, profile.id).catch(async (err) => {
            console.error('Background scan error:', err)
            // Update scan record with error
            const { error: updateError } = await supabaseAdmin
                .from('drive_scans')
                .update({
                    scan_status: 'failed',
                    error_message: err.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', scanRecord.id)

            if (updateError) {
                console.error('Error updating scan record:', updateError)
            }
        })

        return NextResponse.json({
            success: true,
            scanId: scanRecord.id,
            message: 'Scan started successfully'
        })

    } catch (error: any) {
        console.error('Error starting scan:', error)
        return NextResponse.json({ error: error.message || 'Failed to start scan' }, { status: 500 })
    }
}


// GET - Get scan status (admin only)
export async function GET(request: NextRequest) {
    try {
        // Verify Firebase authentication
        const cookieStore = await cookies()
        const firebaseToken = cookieStore.get('firebase-token')?.value

        if (!firebaseToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decodedToken = await verifyIdToken(firebaseToken)
        const profile = await getUserByFirebaseUid(decodedToken.uid)

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const scanId = searchParams.get('scanId')

        if (scanId) {
            // Get specific scan
            const { data, error } = await supabaseAdmin
                .from('drive_scans')
                .select('*')
                .eq('id', scanId)
                .single()

            if (error) {
                return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
            }

            return NextResponse.json({ scan: data })
        } else {
            // Get all scans
            const { data, error } = await supabaseAdmin
                .from('drive_scans')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(50)

            if (error) {
                return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
            }

            return NextResponse.json({ scans: data || [] })
        }

    } catch (error: any) {
        console.error('Error fetching scans:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch scans' }, { status: 500 })
    }
}
