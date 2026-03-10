
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const scanId = searchParams.get('id')

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        if (scanId) {
            // Fetch single scan
            const { data: scan, error } = await supabaseAdmin
                .from('drive_scans')
                .select('*')
                .eq('id', scanId)
                .single()

            if (error) {
                return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 })
            }

            return NextResponse.json({ success: true, scan })
        } else {
            // Fetch all scans
            const { data: scans, error } = await supabaseAdmin
                .from('drive_scans')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(50)

            if (error) {
                console.error('Supabase error fetching scans:', error)
                return NextResponse.json({ success: false, error: 'Failed to fetch scans: ' + error.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, scans })
        }

    } catch (error: any) {
        console.error('Error fetching scan status:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
