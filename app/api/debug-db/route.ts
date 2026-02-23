import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const mainUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const mainKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sadhanaUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL;
    const sadhanaKey = process.env.NEXT_PUBLIC_SADHANA_DB_ANON_KEY;

    const results: any = { serverTime: new Date().toISOString() };

    if (mainUrl && mainKey) {
        try {
            const mainClient = createClient(mainUrl, mainKey);
            const { count } = await mainClient
                .from('sadhana_reports')
                .select('*', { count: 'exact', head: true });
            results.mainDbCount = count;
        } catch (e: any) { results.mainDbError = e.message; }
    }

    if (sadhanaUrl && sadhanaKey) {
        try {
            const sadhanaClient = createClient(sadhanaUrl, sadhanaKey);
            const { count } = await sadhanaClient
                .from('sadhana_reports')
                .select('*', { count: 'exact', head: true });
            results.sadhanaDbCount = count;
        } catch (e: any) { results.sadhanaDbError = e.message; }
    }

    return NextResponse.json({
        systemCheck: results
    });
}
