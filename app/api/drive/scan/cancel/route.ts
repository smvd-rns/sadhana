import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest } from '@/lib/supabase/admin'
import { getAdminSadhanaSupabase } from '@/lib/supabase/sadhana'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { scanId } = body

        if (!scanId) {
            return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 })
        }

        const sadhanaDbAdmin = getAdminSadhanaSupabase();
        if (!sadhanaDbAdmin) {
            return NextResponse.json({ error: 'Database initialization error' }, { status: 500 });
        }

        // Effectively cancel the scan by setting its status to 'failed'
        // The background workers check for non-'processing' status before continuing
        const { error: updateError } = await sadhanaDbAdmin
            .from('drive_scans')
            .update({
                scan_status: 'failed',
                error_message: 'Cancelled by user',
                completed_at: new Date().toISOString()
            })
            .eq('id', scanId)
            .eq('user_id', user.id); // Ensure user can only cancel their own scans

        if (updateError) {
            console.error('Error cancelling scan:', updateError)
            return NextResponse.json({ error: 'Failed to cancel scan' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Scan cancellation requested' })

    } catch (error: any) {
        console.error('Error in scan cancel route:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
