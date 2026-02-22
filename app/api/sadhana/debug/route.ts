import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const mainUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const mainKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sadhanaUrl = process.env.NEXT_PUBLIC_SADHANA_SUPABASE_URL;
    const sadhanaKey = process.env.SADHANA_SUPABASE_SERVICE_ROLE_KEY;

    const mainClient = mainUrl && mainKey ? createClient(mainUrl, mainKey) : null;
    const sadhanaClient = sadhanaUrl && sadhanaKey ? createClient(sadhanaUrl, sadhanaKey) : null;

    const targetUserId = 'ec09780b-6421-4b7f-a4a2-455c223218e5';
    const results: any = { targetUserId };

    if (mainClient) {
        const { data, error } = await mainClient
            .from('sadhana_reports')
            .select('*')
            .eq('user_id', targetUserId)
            .limit(5);
        results.mainDb = {
            count: data?.length || 0,
            columns: data?.[0] ? Object.keys(data[0]) : [],
            sample: data?.[0] || null,
            error
        };
    }

    if (sadhanaClient) {
        const { data, error } = await sadhanaClient
            .from('sadhana_reports')
            .select('*')
            .eq('user_id', targetUserId)
            .limit(5);
        results.sadhanaDb = {
            count: data?.length || 0,
            columns: data?.[0] ? Object.keys(data[0]) : [],
            sample: data?.[0] || null,
            error
        };
    }

    return NextResponse.json(results);
}
