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

export const fetchSadhanaHistory = async (limit: number = 30, userId?: string) => {
    const headers = await getAuthHeader();
    const url = userId
        ? `/api/sadhana/history?limit=${limit}&userId=${userId}&t=${Date.now()}`
        : `/api/sadhana/history?limit=${limit}&t=${Date.now()}`;
    const response = await fetch(url, { headers, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to fetch history');
    return result.data as SadhanaReport[];
};

export const fetchSadhanaReportsByRange = async (from: string, to: string, userId?: string) => {
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

export const fetchBulkSadhanaReports = async (userIds: string[], from: string, to: string) => {
    if (!userIds || userIds.length === 0) return [];

    // We can slice into batches if there are thousands, but limits are generally high enough for hundreds.
    // The API limits at 5000 users.
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
