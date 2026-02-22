import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
    getSadhanaReportByDate,
    submitSadhanaReport
} from '@/lib/supabase/sadhana';

export const dynamic = 'force-dynamic';

async function getAuthUser(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        return null;
    }

    return user;
}

import { canAdminManageTarget } from '@/lib/utils/roles';

export async function GET(request: Request) {
    try {
        const requester = await getAuthUser(request);
        if (!requester) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const targetUserId = searchParams.get('userId') || requester.id;

        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }

        // Authorization Check
        if (targetUserId !== requester.id) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !serviceRoleKey) {
                return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
            }

            const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // Fetch profiles
            const { data: requesterProfile } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', requester.id)
                .single();

            const { data: targetProfile } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', targetUserId)
                .single();

            if (!requesterProfile || !targetProfile) {
                return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
            }

            const isAuthorized = canAdminManageTarget(requesterProfile.role, targetProfile.role, requester.id, targetUserId);

            if (!isAuthorized) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const report = await getSadhanaReportByDate(targetUserId, date);
        const headers = new Headers();
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        headers.set('Pragma', 'no-cache');
        return NextResponse.json({ success: true, data: report }, { headers });

    } catch (error: any) {
        console.error('Sadhana Report API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { report } = body;

        console.log('[SadhanaSubmit] Payload:', JSON.stringify(report));

        if (!report) {
            return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
        }

        // Security: Ensure the user can only submit for themselves
        const reportWithUserId = {
            ...report,
            userId: user.id
        };

        const reportId = await submitSadhanaReport(reportWithUserId);
        return NextResponse.json({ success: true, id: reportId });

    } catch (error: any) {
        console.error('Sadhana Report API POST Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
