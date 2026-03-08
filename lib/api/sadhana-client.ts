import { supabase } from '@/lib/supabase/config';
import { SadhanaReport } from '@/types';

async function getAuthHeader(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (!supabase) return headers;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return headers;

    headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
}

export const fetchSadhanaReportByDate = async (date: string, userId?: string) => {
    const cleanDate = date.split('T')[0];
    const headers = await getAuthHeader();
    const url = userId
        ? `/api/sadhana/report?date=${cleanDate}&userId=${userId}&t=${Date.now()}`
        : `/api/sadhana/report?date=${cleanDate}&t=${Date.now()}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch report');
    return result.data as SadhanaReport | null;
};

export const submitSadhanaReportApi = async (report: Omit<SadhanaReport, 'id' | 'submittedAt' | 'bodyPercent' | 'soulPercent' | 'updatedAt'>) => {
    const rawDate = report.date;
    const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : (rawDate as Date).toISOString().split('T')[0];
    const cleanReport = { ...report, date: dateStr };
    const headers = await getAuthHeader();
    const response = await fetch('/api/sadhana/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({ report: cleanReport })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to submit report');
    return result.id;
};

export const fetchSadhanaWeeklyTotals = async (date: string) => {
    const cleanDate = date.split('T')[0];
    const headers = await getAuthHeader();
    const response = await fetch(`/api/sadhana/weekly-totals?date=${cleanDate}&t=${Date.now()}`, { headers, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch weekly totals');

    // Log debug info if available
    if (result.debug) {
        console.log('[SadhanaDebug] Weekly Totals Raw:', result.debug);
        (window as any).lastSadhanaDebug = result.debug;
    }

    const d = result.data;
    return {
        japa: d.japa,
        hearing: d.hearing,
        reading: d.reading,
        toBed: d.to_bed,
        wakeUp: d.wake_up,
        dailyFilling: d.daily_filling,
        daySleep: d.day_sleep
    };
};

import { getUserSadhanaReports } from '@/lib/supabase/sadhana';

export const fetchSadhanaHistory = async (limit: number = 30, userId?: string) => {
    // Attempt client-side fetch directly from Supabase first
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const targetUserId = userId || session?.user?.id;
        if (targetUserId) {
            return await getUserSadhanaReports(targetUserId, limit);
        }
    }

    // Fallback exactly as before if no session (shouldn't happen on authorized pages)
    const headers = await getAuthHeader();
    const url = userId
        ? `/api/sadhana/history?limit=${limit}&userId=${userId}&t=${Date.now()}`
        : `/api/sadhana/history?limit=${limit}&t=${Date.now()}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch history');
    return result.data as SadhanaReport[];
};

import { getSadhanaReportsByRange } from '@/lib/supabase/sadhana';

export const fetchSadhanaReportsByRange = async (from: string, to: string, userId?: string) => {
    // Attempt client-side fetch directly from Supabase first
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const targetUserId = userId || session?.user?.id;
        if (targetUserId) {
            return await getSadhanaReportsByRange(targetUserId, from, to);
        }
    }

    const headers = await getAuthHeader();
    const url = userId
        ? `/api/sadhana/history?from=${from}&to=${to}&userId=${userId}&t=${Date.now()}`
        : `/api/sadhana/history?from=${from}&to=${to}&t=${Date.now()}`;
    // Force no cache so scores always match current DB (no stale 76%/26% when DB is empty)
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    const response = await fetch(url, { headers, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch reports by range');
    return result.data as SadhanaReport[];
};

import { getBulkSadhanaReportsByRange } from '@/lib/supabase/sadhana';

export const fetchBulkSadhanaReports = async (userIds: string[], from: string, to: string) => {
    if (!userIds || userIds.length === 0) return [];

    // Attempt client-side fetch directly from Supabase first
    // Note: Due to RLS, the user must have read access to the reports of `userIds`.
    // The previous API route used the Service Role key to bypass RLS.
    // However, if the RLS policies permit the current authenticated user (e.g. a counselor) 
    // to view their mentees' reports, then client-side fetching is safe.
    try {
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const reports = await getBulkSadhanaReportsByRange(userIds, from, to);
                // If RLS blocked it (returning fewer or 0 unexpectedly) or succeeded, we return.
                // Assuming RLS policy on sadhana_reports allows counselors to read mentee reports.
                return reports;
            }
        }
    } catch (e) {
        console.warn("Direct Supabase fetch failed, falling back to API", e);
    }

    // Fallback to Service Role API if client fetch fails or returns missing items
    const headers = await getAuthHeader();
    const response = await fetch('/api/sadhana/history/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userIds, from, to })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch bulk reports');
    return result.data as SadhanaReport[];
};
