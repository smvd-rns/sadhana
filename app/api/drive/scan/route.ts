import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/supabase/admin'
import { getUserData } from '@/lib/supabase/auth'
import { createClient } from '@supabase/supabase-js'
import { extractFolderId, scanFolderAndSave } from '@/lib/utils/driveScan'

export const maxDuration = 60;

// Use Secondary (Sadhana) Database for the 'drive_scans' table
const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL!
const sadhanaDbServiceKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY!
const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbServiceKey)

// POST - Start a Drive folder scan (admin only)
export async function POST(request: NextRequest) {
    try {
        // Verify Supabase authentication
        const user = await getAuthUserFromRequest(request as any)

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const profile = await getUserData(user.id)

        // Allow all verified users to scan for now as requested
        /*
        const isAdmin = profile?.role && (
            profile.role === 'super_admin' ||
            profile.role === 'president' ||
            profile.role === 'vice_president' ||
            (Array.isArray(profile.role) && profile.role.includes('super_admin'))
        )

        if (!profile || !isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        */
        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        const body = await request.json()
        const { driveLink, displayName, description } = body

        if (!driveLink) {
            return NextResponse.json({ error: 'Drive link is required' }, { status: 400 })
        }

        // Extract folder ID from the link
        const folderId = extractFolderId(driveLink.trim())
        if (!folderId) {
            return NextResponse.json({ error: 'Invalid Drive folder link. Please provide a valid Google Drive folder URL.' }, { status: 400 })
        }

        const userName = profile.name || profile.email

        // Create scan record with Sadhana DB explicitly!
        const { data: scanRecord, error: scanError } = await sadhanaDbAdmin
            .from('drive_scans')
            .insert({
                user_id: profile.id,
                user_name: userName,
                drive_link: driveLink,
                description: description || null,
                scan_status: 'processing',
                started_at: new Date().toISOString(),
                metadata: {
                    display_name: displayName || null
                }
            })
            .select()
            .single()

        if (scanError || !scanRecord) {
            console.error('Error creating scan record:', scanError)
            return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 })
        }

        // Start scanning in the background (fire-and-forget; Vercel limits apply)
        scanFolderAndSave(folderId, scanRecord.id, profile.id, displayName).catch(async (err) => {
            console.error('Background scan error:', err)
            // Update scan record with error
            const { error: updateError } = await sadhanaDbAdmin
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
        // Verify Supabase authentication
        const user = await getAuthUserFromRequest(request as any)

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const profile = await getUserData(user.id)

        /*
        const isAdmin = profile?.role && (
            profile.role === 'super_admin' ||
            profile.role === 'president' ||
            profile.role === 'vice_president' ||
            (Array.isArray(profile.role) && profile.role.includes('super_admin'))
        )

        if (!profile || !isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        */

        const { searchParams } = new URL(request.url)
        const scanId = searchParams.get('scanId')

        if (scanId) {
            // Get specific scan
            const { data, error } = await sadhanaDbAdmin
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
            const { data, error } = await sadhanaDbAdmin
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
