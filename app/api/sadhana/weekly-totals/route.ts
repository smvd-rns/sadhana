import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase/admin';
import { getWeeklyTotals } from '@/lib/supabase/sadhana';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
    try {
        const user = await getAuthUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }

        const totals = await getWeeklyTotals(user.id, date);

        const headers = new Headers({
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        return NextResponse.json({
            success: true,
            data: {
                japa: totals.japa,
                hearing: totals.hearing,
                reading: totals.reading,
                to_bed: totals.toBed,
                wake_up: totals.wakeUp,
                daily_filling: totals.dailyFilling,
                day_sleep: totals.daySleep
            }
        }, { headers });

    } catch (error: any) {
        console.error('Sadhana Weekly Totals API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
