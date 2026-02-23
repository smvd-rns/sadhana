import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

export async function GET(request: Request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }

        // Parse the date to compute week range (Mon-Sun)
        const parts = date.split('T')[0].split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const dayVal = parseInt(parts[2], 10);

        const inputDate = new Date(year, month, dayVal, 12, 0, 0);
        const dayOfWeek = inputDate.getDay();
        const diff = inputDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

        const startOfWeek = new Date(year, month, diff);
        const endOfWeek = new Date(year, month, diff + 6);

        const pad = (n: number) => String(n).padStart(2, '0');
        const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const startDateStr = fmt(startOfWeek);
        const endDateStr = fmt(endOfWeek);

        // EXTRA DEBUG INFO FOR THE RESPONSE
        const debugInfo: any = {
            userId: user.id,
            requestedDate: date,
            computedRange: `${startDateStr} to ${endDateStr}`,
            parts: { year, month: month + 1, dayVal },
            inputDate: inputDate.toISOString(),
            diff
        };

        const mainDbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const mainDbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!mainDbUrl || !mainDbKey) {
            return NextResponse.json({ error: 'Main DB not configured', debugInfo }, { status: 500 });
        }

        const mainDbClient = createClient(mainDbUrl, mainDbKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { data, error: queryError } = await mainDbClient
            .from('sadhana_reports')
            .select('japa, hearing, reading, to_bed, wake_up, daily_filling, day_sleep, date')
            .eq('user_id', user.id)
            .gte('date', startDateStr)
            .lte('date', endDateStr);

        debugInfo.rowsFound = data?.length ?? 0;
        debugInfo.queryError = queryError;

        if (data && data.length > 0) {
            debugInfo.sampleDates = data.slice(0, 3).map(r => r.date);
        }

        if (queryError) {
            return NextResponse.json({ error: queryError.message, debugInfo }, { status: 500 });
        }

        let japa = 0, hearing = 0, reading = 0, to_bed = 0, wake_up = 0, daily_filling = 0, day_sleep = 0;
        if (data) {
            for (const row of data) {
                japa += Number(row.japa || 0);
                hearing += Number(row.hearing || 0);
                reading += Number(row.reading || 0);
                to_bed += Number(row.to_bed || 0);
                wake_up += Number(row.wake_up || 0);
                daily_filling += Number(row.daily_filling || 0);
                day_sleep += Number(row.day_sleep || 0);
            }
        }

        const headers = new Headers({
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        return NextResponse.json({
            success: true,
            data: { japa, hearing, reading, to_bed, wake_up, daily_filling, day_sleep },
            debug: debugInfo
        }, { headers });

    } catch (error: any) {
        console.error('Sadhana Weekly Totals API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
