import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { SadhanaReport } from '@/types';

// Helper function to normalize date to ISO string
const normalizeDate = (date: Date | string | Timestamp | any): string => {
  if (!date) return '';
  
  // Handle Firestore Timestamp
  if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate().toISOString().split('T')[0];
  }
  
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
  if (!db) {
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

    // Generate all dates in the week as strings (Monday to Sunday)
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      weekDates.push(currentDate.toISOString().split('T')[0]);
    }

    // Fetch all reports for the user and filter by week dates
    const q = query(
      collection(db, 'sadhanaReports'),
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    let japaTotal = 0;
    let hearingTotal = 0;
    let readingTotal = 0;
    let toBedTotal = 0;
    let wakeUpTotal = 0;
    let dailyFillingTotal = 0;
    let daySleepTotal = 0;

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const reportDate = normalizeDate(data.date);
      if (weekDates.includes(reportDate)) {
        // Only add if the field exists and is a number
        japaTotal += (typeof data.japa === 'number' ? data.japa : 0);
        hearingTotal += (typeof data.hearing === 'number' ? data.hearing : 0);
        readingTotal += (typeof data.reading === 'number' ? data.reading : 0);
        toBedTotal += (typeof data.toBed === 'number' ? data.toBed : 0);
        wakeUpTotal += (typeof data.wakeUp === 'number' ? data.wakeUp : 0);
        dailyFillingTotal += (typeof data.dailyFilling === 'number' ? data.dailyFilling : 0);
        daySleepTotal += (typeof data.daySleep === 'number' ? data.daySleep : 0);
      }
    });
    
    console.log('Weekly totals calculated:', {
      userId,
      weekDates,
      reportsFound: querySnapshot.docs.length,
      totals: {
        japa: japaTotal,
        hearing: hearingTotal,
        reading: readingTotal,
        toBed: toBedTotal,
        wakeUp: wakeUpTotal,
        dailyFilling: dailyFillingTotal,
        daySleep: daySleepTotal
      }
    });

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
    console.error('Error fetching weekly totals:', error);
    // Fallback: try without orderBy if index doesn't exist
    try {
      const q = query(
        collection(db, 'sadhanaReports'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
      const startOfWeek = new Date(dateObj);
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      startOfWeek.setDate(diff);
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);
        weekDates.push(currentDate.toISOString().split('T')[0]);
      }

      let japaTotal = 0;
      let hearingTotal = 0;
      let readingTotal = 0;
      let toBedTotal = 0;
      let wakeUpTotal = 0;
      let dailyFillingTotal = 0;
      let daySleepTotal = 0;

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const reportDate = normalizeDate(data.date);
        if (weekDates.includes(reportDate)) {
          // Only add if the field exists and is a number
          japaTotal += (typeof data.japa === 'number' ? data.japa : 0);
          hearingTotal += (typeof data.hearing === 'number' ? data.hearing : 0);
          readingTotal += (typeof data.reading === 'number' ? data.reading : 0);
          toBedTotal += (typeof data.toBed === 'number' ? data.toBed : 0);
          wakeUpTotal += (typeof data.wakeUp === 'number' ? data.wakeUp : 0);
          dailyFillingTotal += (typeof data.dailyFilling === 'number' ? data.dailyFilling : 0);
          daySleepTotal += (typeof data.daySleep === 'number' ? data.daySleep : 0);
        }
      });
      
      console.log('Weekly totals (fallback):', {
        userId,
        weekDates,
        reportsFound: querySnapshot.docs.length,
        totals: {
          japa: japaTotal,
          hearing: hearingTotal,
          reading: readingTotal,
          toBed: toBedTotal,
          wakeUp: wakeUpTotal,
          dailyFilling: dailyFillingTotal,
          daySleep: daySleepTotal
        }
      });

      return { 
        japa: japaTotal, 
        hearing: hearingTotal, 
        reading: readingTotal,
        toBed: toBedTotal,
        wakeUp: wakeUpTotal,
        dailyFilling: dailyFillingTotal,
        daySleep: daySleepTotal
      };
    } catch (fallbackError) {
      console.error('Error in fallback weekly totals:', fallbackError);
      return { japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 };
    }
  }
};

export const submitSadhanaReport = async (report: Omit<SadhanaReport, 'id' | 'submittedAt' | 'bodyPercent' | 'soulPercent' | 'updatedAt'>) => {
  if (!db) {
    throw new Error('Firebase is not initialized');
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
      ...report,
      date: dateStr,
      bodyPercent: Math.min(100, Math.max(0, bodyPercent)),
      soulPercent: Math.min(100, Math.max(0, soulPercent)),
      submittedAt: existingReport ? (existingReport.submittedAt || new Date()) : new Date(),
      updatedAt: new Date(),
    };

    if (existingReport) {
      // Update existing report
      const docRef = doc(db, 'sadhanaReports', existingReport.id);
      await updateDoc(docRef, reportData);
      return existingReport.id;
    } else {
      // Create new report
      const docRef = await addDoc(collection(db, 'sadhanaReports'), reportData);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error submitting sadhana report:', error);
    throw error;
  }
};

export const getUserSadhanaReports = async (userId: string, limitCount: number = 30) => {
  if (!db) {
    console.error('Firebase is not initialized');
    return [];
  }
  
  try {
    const q = query(
      collection(db, 'sadhanaReports'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Normalize the date to string format
      const normalizedDate = normalizeDate(data.date);
      return {
        id: doc.id,
        ...data,
        date: normalizedDate,
      };
    }) as SadhanaReport[];
  } catch (error) {
    console.error('Error fetching sadhana reports:', error);
    return [];
  }
};

export const getSadhanaReportByDate = async (userId: string, date: Date | string) => {
  if (!db) {
    console.error('Firebase is not initialized');
    return null;
  }
  
  try {
    const dateStr = normalizeDate(date);
    const q = query(
      collection(db, 'sadhanaReports'),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      // Normalize the date to string format
      const normalizedDate = normalizeDate(data.date);
      return { 
        id: doc.id, 
        ...data,
        date: normalizedDate, // Normalize to string format
      } as SadhanaReport;
    }
    return null;
  } catch (error) {
    console.error('Error fetching sadhana report:', error);
    return null;
  }
};
