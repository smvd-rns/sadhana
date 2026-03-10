import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL!;
const sadhanaDbServiceKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY!;
const sadhanaDbAdmin = createClient(sadhanaDbUrl, sadhanaDbServiceKey);

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUserFromRequest(request as any);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids } = await request.json();
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No file IDs provided' }, { status: 400 });
        }

        console.log(`[Delete API] User ${user.id} attempting to delete ${ids.length} files:`, ids);

        // Perform deletion using Admin client (Service Role)
        // We still enforce owner-based deletion but using the admin client ensures RLS doesn't block us
        const { data, error, count } = await sadhanaDbAdmin
            .from('files')
            .delete({ count: 'exact' })
            .in('id', ids)
            .eq('user_id', user.id); // Security: Only delete if user owns them

        if (error) {
            console.error('[Delete API] Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[Delete API] Successfully deleted ${count} rows`);

        return NextResponse.json({
            success: true,
            deletedCount: count
        });

    } catch (error: any) {
        console.error('[Delete API] Server error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
