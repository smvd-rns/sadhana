import { createClient } from '@supabase/supabase-js';
import { supabase } from './config';
import { SadhanaReport } from '@/types';

// Singleton admin client — created once, reused across all calls to avoid connection/memory leaks
let _sadhanaAdminClient: ReturnType<typeof createClient> | null = null;

const getSadhanaAdminClient = () => {
  if (_sadhanaAdminClient) return _sadhanaAdminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _sadhanaAdminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _sadhanaAdminClient;
};

// Use admin client on server side (bypasses RLS), browser client on client side
const activeSupabase = (typeof window === 'undefined') ? (getSadhanaAdminClient() || supabase) : supabase;

// Helper function to normalize date to ISO string
const normalizeDate = (date: Date | string | any): string => {
  if (!date) return '';

  // Handle string
  if (typeof date === 'string') {
    return date.split('T')[0];
  }

  // Handle Date object
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }

  // Fallback: try to convert
  try {
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Error normalizing date:', date, e);
  }

  return '';
};

// Calculate scores (weekly basis)
export const calculateSadhanaScores = (japa: number, hearing: number, reading: number, toBed: number, wakeUp: number, dailyFilling: number, daySleep: number) => {
  // These are stored per day but calculated weekly
  // Body % = (To Bed + Wake Up + Daily Filling + Day Sleep) / 280 × 100 (weekly)
  // Soul % = (Japa + Hearing + Reading) / 210 × 100 (weekly)
  // Capping each component at its weekly maximum (70)
  const bodyPercent = ((Math.min(70, toBed) + Math.min(70, wakeUp) + Math.min(70, dailyFilling) + Math.min(70, daySleep)) / 280) * 100;
  const soulPercent = ((Math.min(70, japa) + Math.min(70, hearing) + Math.min(70, reading)) / 210) * 100;
  return {
    bodyPercent: Math.min(100, Math.max(0, bodyPercent)),
    soulPercent: Math.min(100, Math.max(0, soulPercent)),
  };
};

// Get weekly totals for a specific date (for validation and calculations)
export const getWeeklyTotals = async (userId: string, date: Date | string): Promise<{ japa: number; hearing: number; reading: number; toBed: number; wakeUp: number; dailyFilling: number; daySleep: number }> => {
  const freshClient = getSadhanaAdminClient() || activeSupabase;
  if (!freshClient) {
    return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
  }

  try {
    // Manually parse YYYY-MM-DD or handle Date object to avoid timezone shifts
    let year: number, month: number, dayVal: number;

    if (typeof date === 'string') {
      const parts = date.split('T')[0].split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      dayVal = parseInt(parts[2], 10);
    } else {
      year = date.getFullYear();
      month = date.getMonth();
      dayVal = date.getDate();
    }

    const inputDate = new Date(year, month, dayVal, 12, 0, 0); // Midday to be safe

    // Calculate Monday of the week
    const dayOfWeek = inputDate.getDay(); // 0 is Sunday
    const diff = inputDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const startOfWeek = new Date(year, month, diff, 0, 0, 0, 0);
    const endOfWeek = new Date(year, month, diff + 6, 23, 59, 59, 999);

    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    const startDateStr = formatDateStr(startOfWeek);
    const endDateStr = formatDateStr(endOfWeek);

    console.log(`[SadhanaBackend] getWeeklyTotals Query:`, { userId, date, startDateStr, endDateStr });

    const { data, error } = await freshClient
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) throw error;

    console.log(`[SadhanaBackend] Found ${data?.length || 0} rows for user ${userId}`);

    let japaTotal = 0, hearingTotal = 0, readingTotal = 0;
    let toBedTotal = 0, wakeUpTotal = 0, dailyFillingTotal = 0, daySleepTotal = 0;

    if (data) {
      data.forEach((report: any) => {
        japaTotal += Number(report.japa || 0);
        hearingTotal += Number(report.hearing || 0);
        readingTotal += Number(report.reading || 0);
        toBedTotal += Number(report.to_bed || 0);
        wakeUpTotal += Number(report.wake_up || 0);
        dailyFillingTotal += Number(report.daily_filling || 0);
        daySleepTotal += Number(report.day_sleep || 0);
      });
    }

    return {
      japa: japaTotal, hearing: hearingTotal, reading: readingTotal,
      toBed: toBedTotal, wakeUp: wakeUpTotal, dailyFilling: dailyFillingTotal, daySleep: daySleepTotal
    };
  } catch (error) {
    console.error('Error in getWeeklyTotals:', error);
    return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
  }
};

// Get monthly totals for a specific date
export const getMonthlyTotals = async (userId: string, date: Date | string): Promise<{ japa: number; hearing: number; reading: number; toBed: number; wakeUp: number; dailyFilling: number; daySleep: number; daysInMonth: number }> => {
  if (!activeSupabase) {
    return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0, daysInMonth: 30 };
  }

  try {
    let year: number, month: number;
    if (typeof date === 'string') {
      const parts = date.split('T')[0].split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    } else {
      year = date.getFullYear();
      month = date.getMonth();
    }

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = endOfMonth.getDate();

    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { data, error } = await activeSupabase
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (error) throw error;

    let japaTotal = 0, hearingTotal = 0, readingTotal = 0;
    let toBedTotal = 0, wakeUpTotal = 0, dailyFillingTotal = 0, daySleepTotal = 0;

    if (data) {
      data.forEach((report: any) => {
        japaTotal += Number(report.japa || 0);
        hearingTotal += Number(report.hearing || 0);
        readingTotal += Number(report.reading || 0);
        toBedTotal += Number(report.to_bed || 0);
        wakeUpTotal += Number(report.wake_up || 0);
        dailyFillingTotal += Number(report.daily_filling || 0);
        daySleepTotal += Number(report.day_sleep || 0);
      });
    }

    return {
      japa: japaTotal, hearing: hearingTotal, reading: readingTotal,
      toBed: toBedTotal, wakeUp: wakeUpTotal, dailyFilling: dailyFillingTotal, daySleep: daySleepTotal,
      daysInMonth
    };
  } catch (error) {
    console.error('Error in getMonthlyTotals:', error);
    return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0, daysInMonth: 30 };
  }
};

export const submitSadhanaReport = async (report: Omit<SadhanaReport, 'id' | 'submittedAt' | 'bodyPercent' | 'soulPercent' | 'updatedAt'>) => {
  if (!activeSupabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const dateStr = normalizeDate(report.date);

    // Check if report already exists for this date
    const existingReport = await getSadhanaReportByDate(report.userId, dateStr);

    // Get weekly totals to calculate weekly percentages
    const weeklyTotals = await getWeeklyTotals(report.userId, dateStr);

    // Calculate current week totals including this report
    const currentJapaTotal = weeklyTotals.japa - (existingReport?.japa || 0) + report.japa;
    const currentHearingTotal = weeklyTotals.hearing - (existingReport?.hearing || 0) + report.hearing;
    const currentReadingTotal = weeklyTotals.reading - (existingReport?.reading || 0) + report.reading;

    const currentToBedTotal = weeklyTotals.toBed - (existingReport?.toBed || 0) + report.toBed;
    const currentWakeUpTotal = weeklyTotals.wakeUp - (existingReport?.wakeUp || 0) + report.wakeUp;
    const currentDailyFillingTotal = weeklyTotals.dailyFilling - (existingReport?.dailyFilling || 0) + report.dailyFilling;
    const currentDaySleepTotal = weeklyTotals.daySleep - (existingReport?.daySleep || 0) + report.daySleep;

    // Calculate weekly percentages capped at 70 per practice
    const cappedSoulTotal = Math.min(70, currentJapaTotal) + Math.min(70, currentHearingTotal) + Math.min(70, currentReadingTotal);
    const soulPercent = (cappedSoulTotal / 210) * 100;

    const cappedBodyTotal = Math.min(70, currentToBedTotal) + Math.min(70, currentWakeUpTotal) + Math.min(70, currentDailyFillingTotal) + Math.min(70, currentDaySleepTotal);
    const bodyPercent = (cappedBodyTotal / 280) * 100;

    const reportData = {
      user_id: report.userId,
      date: dateStr,
      japa: report.japa,
      hearing: report.hearing,
      reading: report.reading,
      book_name: report.bookName || null,
      to_bed: report.toBed,
      wake_up: report.wakeUp,
      daily_filling: report.dailyFilling,
      day_sleep: report.daySleep,
      body_percent: Math.min(100, Math.max(0, bodyPercent)),
      soul_percent: Math.min(100, Math.max(0, soulPercent)),
      submitted_at: existingReport ? (existingReport.submittedAt ? new Date(existingReport.submittedAt).toISOString() : new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingReport) {
      // Update existing report
      const { data, error } = await activeSupabase
        .from('sadhana_reports')
        .update(reportData)
        .eq('id', existingReport.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return existingReport.id;
    } else {
      // Create new report
      const { data, error } = await activeSupabase
        .from('sadhana_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    }
  } catch (error: any) {
    console.error('Error submitting sadhana report:', error);
    throw new Error(error.message || 'Failed to submit sadhana report');
  }
};

export const getUserSadhanaReports = async (userId: string, limitCount: number = 30) => {
  if (!activeSupabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await activeSupabase
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error('Error fetching sadhana reports:', error);
      return [];
    }

    return (data || []).map((report: any) => ({
      id: report.id,
      userId: report.user_id,
      date: normalizeDate(report.date),
      japa: report.japa,
      hearing: report.hearing,
      reading: report.reading,
      bookName: report.book_name,
      toBed: report.to_bed,
      wakeUp: report.wake_up,
      dailyFilling: report.daily_filling,
      daySleep: report.day_sleep,
      bodyPercent: report.body_percent,
      soulPercent: report.soul_percent,
      submittedAt: new Date(report.submitted_at),
      updatedAt: report.updated_at ? new Date(report.updated_at) : undefined,
    })) as SadhanaReport[];
  } catch (error) {
    console.error('Error fetching sadhana reports:', error);
    return [];
  }
};

export const getSadhanaReportsByRange = async (userId: string, fromDate: string, toDate: string) => {
  if (!activeSupabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await activeSupabase
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching sadhana reports by range:', error);
      return [];
    }

    return (data || []).map((report: any) => ({
      id: report.id,
      userId: report.user_id,
      date: normalizeDate(report.date),
      japa: report.japa,
      hearing: report.hearing,
      reading: report.reading,
      bookName: report.book_name,
      toBed: report.to_bed,
      wakeUp: report.wake_up,
      dailyFilling: report.daily_filling,
      daySleep: report.day_sleep,
      bodyPercent: report.body_percent,
      soulPercent: report.soul_percent,
      submittedAt: new Date(report.submitted_at),
      updatedAt: report.updated_at ? new Date(report.updated_at) : undefined,
    })) as SadhanaReport[];
  } catch (error) {
    console.error('Error fetching sadhana reports by range:', error);
    return [];
  }
};

export const getSadhanaReportByDate = async (userId: string, date: Date | string) => {
  if (!activeSupabase) {
    console.error('Supabase is not initialized');
    return null;
  }

  try {
    const dateStr = normalizeDate(date);
    const { data, error } = await activeSupabase
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('date', normalizeDate(date))
      .maybeSingle();
    // Use maybeSingle() instead of single() - returns null if no result instead of 406 error

    if (error) {
      console.error('Error fetching sadhana report by date:', error);
      return null;
    }

    if (!data) {
      return null; // No report exists for this date
    }

    return {
      id: data.id,
      userId: data.user_id,
      date: normalizeDate(data.date),
      japa: data.japa,
      hearing: data.hearing,
      reading: data.reading,
      bookName: data.book_name,
      toBed: data.to_bed,
      wakeUp: data.wake_up,
      dailyFilling: data.daily_filling,
      daySleep: data.day_sleep,
      bodyPercent: data.body_percent,
      soulPercent: data.soul_percent,
      submittedAt: new Date(data.submitted_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    } as SadhanaReport;
  } catch (error) {
    console.error('Error fetching sadhana report:', error);
    return null;
  }
};

export const getBulkSadhanaReportsByRange = async (userIds: string[], fromDate: string, toDate: string) => {
  if (!activeSupabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    // If userIds is empty, we don't need to query.
    if (!userIds || userIds.length === 0) return [];

    const { data, error } = await activeSupabase
      .from('sadhana_reports')
      .select('*')
      .in('user_id', userIds)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching bulk sadhana reports by range:', error);
      return [];
    }

    return (data || []).map((report: any) => ({
      id: report.id,
      userId: report.user_id,
      date: normalizeDate(report.date),
      japa: report.japa,
      hearing: report.hearing,
      reading: report.reading,
      bookName: report.book_name,
      toBed: report.to_bed,
      wakeUp: report.wake_up,
      dailyFilling: report.daily_filling,
      daySleep: report.day_sleep,
      bodyPercent: report.body_percent,
      soulPercent: report.soul_percent,
      submittedAt: new Date(report.submitted_at),
      updatedAt: report.updated_at ? new Date(report.updated_at) : undefined,
    })) as SadhanaReport[];
  } catch (error) {
    console.error('Error fetching bulk sadhana reports by range:', error);
    return [];
  }
};
