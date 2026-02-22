import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
    getSadhanaReportsByRange,
    getUserSadhanaReports
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
        const targetUserId = searchParams.get('userId') || requester.id;
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 30;

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

            // Fetch requester profile
            const { data: requesterProfile } = await supabaseAdmin
                .from('users')
                .select('role, id')
                .eq('id', requester.id)
                .single();

            // Fetch target user profile
            const { data: targetProfile } = await supabaseAdmin
                .from('users')
                .select('role, id')
                .eq('id', targetUserId)
                .single();

            if (!requesterProfile || !targetProfile) {
                return NextResponse.json({ error: 'User profiles not found' }, { status: 404 });
            }

            // check permissions using role logic
            const isAuthorized = canAdminManageTarget(requesterProfile.role, targetProfile.role, requester.id, targetUserId);

            if (!isAuthorized) {
                return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
            }
        }

        let reports;
        if (from && to) {
            reports = await getSadhanaReportsByRange(targetUserId, from, to);
        } else {
            reports = await getUserSadhanaReports(targetUserId, limit);
        }

        // Prevent any caching so scores always reflect current DB state
        const headers = new Headers();
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        headers.set('Pragma', 'no-cache');
        return NextResponse.json({ success: true, data: reports }, { headers });

    } catch (error: any) {
        console.error('Sadhana History API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
