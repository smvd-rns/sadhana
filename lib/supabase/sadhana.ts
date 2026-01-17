import { supabase } from './config';
import { SadhanaReport } from '@/types';

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
  const bodyPercent = ((toBed + wakeUp + dailyFilling + daySleep) / 280) * 100;
  const soulPercent = ((japa + hearing + reading) / 210) * 100;
  return {
    bodyPercent: Math.min(100, Math.max(0, bodyPercent)),
    soulPercent: Math.min(100, Math.max(0, soulPercent)),
  };
};

// Get weekly totals for a specific date (for validation and calculations)
export const getWeeklyTotals = async (userId: string, date: Date | string): Promise<{ japa: number; hearing: number; reading: number; toBed: number; wakeUp: number; dailyFilling: number; daySleep: number }> => {
  if (!supabase) {
    return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    const startOfWeek = new Date(dateObj);
    // Calculate Monday (day 0 = Sunday, so Monday = day 1)
    const day = dateObj.getDay();
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];

    // Fetch all reports for the user in this week
    const { data, error } = await supabase
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching weekly totals:', error);
      return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
    }

    let japaTotal = 0;
    let hearingTotal = 0;
    let readingTotal = 0;
    let toBedTotal = 0;
    let wakeUpTotal = 0;
    let dailyFillingTotal = 0;
    let daySleepTotal = 0;

    if (data) {
      data.forEach((report: any) => {
        japaTotal += (typeof report.japa === 'number' ? report.japa : 0);
        hearingTotal += (typeof report.hearing === 'number' ? report.hearing : 0);
        readingTotal += (typeof report.reading === 'number' ? report.reading : 0);
        toBedTotal += (typeof report.to_bed === 'number' ? report.to_bed : 0);
        wakeUpTotal += (typeof report.wake_up === 'number' ? report.wake_up : 0);
        dailyFillingTotal += (typeof report.daily_filling === 'number' ? report.daily_filling : 0);
        daySleepTotal += (typeof report.day_sleep === 'number' ? report.day_sleep : 0);
      });
    }

    // console.log('Weekly totals calculated:', {
    //   userId,
    //   startDate: startDateStr,
    //   endDate: endDateStr,
    //   reportsFound: data?.length || 0,
    //   totals: {
    //     japa: japaTotal,
    //     hearing: hearingTotal,
    //     reading: readingTotal,
    //     toBed: toBedTotal,
    //     wakeUp: wakeUpTotal,
    //     dailyFilling: dailyFillingTotal,
    //     daySleep: daySleepTotal
    //   }
    // });

    return {
      japa: japaTotal,
      hearing: hearingTotal,
      reading: readingTotal,
      toBed: toBedTotal,
      wakeUp: wakeUpTotal,
      dailyFilling: dailyFillingTotal,
      daySleep: daySleepTotal
    };
  } catch (error) {
    console.error('Error in getWeeklyTotals:', error);
    return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
  }
};

export const submitSadhanaReport = async (report: Omit<SadhanaReport, 'id' | 'submittedAt' | 'bodyPercent' | 'soulPercent' | 'updatedAt'>) => {
  if (!supabase) {
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

    // Calculate weekly percentages
    const bodyPercent = ((currentToBedTotal + currentWakeUpTotal + currentDailyFillingTotal + currentDaySleepTotal) / 280) * 100;
    const soulPercent = ((currentJapaTotal + currentHearingTotal + currentReadingTotal) / 210) * 100;

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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
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

export const getSadhanaReportByDate = async (userId: string, date: Date | string) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return null;
  }

  try {
    const dateStr = normalizeDate(date);
    const { data, error } = await supabase
      .from('sadhana_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result instead of 406 error

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
