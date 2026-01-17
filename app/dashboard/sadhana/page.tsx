'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { submitSadhanaReport, getSadhanaReportByDate, getWeeklyTotals } from '@/lib/supabase/sadhana';
import { SadhanaReport } from '@/types';
import { CheckCircle, AlertCircle, Upload, BookOpen, Clock, Moon, Sun, Coffee, Bed, Calendar, X } from 'lucide-react';

export default function SadhanaPage() {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date as default
    japa: 0,
    hearing: 0,
    reading: 0,
    bookName: '',
    toBed: 0,
    wakeUp: 0,
    dailyFilling: 0,
    daySleep: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [existingReport, setExistingReport] = useState<SadhanaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyTotals, setWeeklyTotals] = useState({ japa: 0, hearing: 0, reading: 0, toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0 });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get today's date in YYYY-MM-DD format (max date for date picker)
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadReport = async () => {
      if (userData) {
        try {
          const report = await getSadhanaReportByDate(userData.id, formData.date);
          if (report) {
            setExistingReport(report);
            setFormData({
              date: typeof report.date === 'string' ? report.date : report.date.toISOString().split('T')[0],
              japa: typeof report.japa === 'number' ? report.japa : 0,
              hearing: typeof report.hearing === 'number' ? report.hearing : 0,
              reading: typeof report.reading === 'number' ? report.reading : 0,
              bookName: report.bookName || '',
              toBed: typeof report.toBed === 'number' ? report.toBed : 0,
              wakeUp: typeof report.wakeUp === 'number' ? report.wakeUp : 0,
              dailyFilling: typeof report.dailyFilling === 'number' ? report.dailyFilling : 0,
              daySleep: typeof report.daySleep === 'number' ? report.daySleep : 0,
            });
          } else {
            setExistingReport(null);
            // Reset form data if no report exists
            setFormData(prev => ({
              ...prev,
              japa: 0,
              hearing: 0,
              reading: 0,
              bookName: '',
              toBed: 0,
              wakeUp: 0,
              dailyFilling: 0,
              daySleep: 0,
            }));
          }

          // Load weekly totals for validation and calculations
          const totals = await getWeeklyTotals(userData.id, formData.date);
          // console.log('Loaded weekly totals:', totals);
          setWeeklyTotals(totals);
        } catch (error) {
          console.error('Error loading sadhana report:', error);
          setError('Failed to load sadhana data. Please refresh the page.');
        } finally {
          setLoading(false);
        }
      }
    };
    loadReport();
  }, [userData, formData.date]);

  // Validate form data
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Check daily limits (max 10 per day)
    if (formData.japa > 10) {
      errors.push('Japa marks cannot exceed 10 per day');
    }
    if (formData.hearing > 10) {
      errors.push('Hearing marks cannot exceed 10 per day');
    }
    if (formData.reading > 10) {
      errors.push('Reading marks cannot exceed 10 per day');
    }

    // Check weekly limits (max 70 per week)
    const currentJapaTotal = weeklyTotals.japa - (existingReport?.japa || 0) + formData.japa;
    const currentHearingTotal = weeklyTotals.hearing - (existingReport?.hearing || 0) + formData.hearing;
    const currentReadingTotal = weeklyTotals.reading - (existingReport?.reading || 0) + formData.reading;

    if (currentJapaTotal > 70) {
      errors.push(`Japa marks cannot exceed 70 per week. Current weekly total: ${currentJapaTotal}`);
    }
    if (currentHearingTotal > 70) {
      errors.push(`Hearing marks cannot exceed 70 per week. Current weekly total: ${currentHearingTotal}`);
    }
    if (currentReadingTotal > 70) {
      errors.push(`Reading marks cannot exceed 70 per week. Current weekly total: ${currentReadingTotal}`);
    }

    // Check date is not in future
    if (formData.date > today) {
      errors.push('Cannot select a future date');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    if (!validateForm()) {
      setError('Please fix the validation errors');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await submitSadhanaReport({
        userId: userData.id,
        date: formData.date,
        japa: formData.japa,
        hearing: formData.hearing,
        reading: formData.reading,
        bookName: formData.bookName || undefined,
        toBed: formData.toBed,
        wakeUp: formData.wakeUp,
        dailyFilling: formData.dailyFilling,
        daySleep: formData.daySleep,
      });

      setSuccess('Sadhana report submitted successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Reload the report and weekly totals
      const report = await getSadhanaReportByDate(userData.id, formData.date);
      setExistingReport(report);
      const totals = await getWeeklyTotals(userData.id, formData.date);
      setWeeklyTotals(totals);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate weekly scores for display
  const calculateWeeklyScores = () => {
    // Get current week totals including current form data
    const currentJapaTotal = weeklyTotals.japa - (existingReport?.japa || 0) + formData.japa;
    const currentHearingTotal = weeklyTotals.hearing - (existingReport?.hearing || 0) + formData.hearing;
    const currentReadingTotal = weeklyTotals.reading - (existingReport?.reading || 0) + formData.reading;

    const currentToBedTotal = weeklyTotals.toBed - (existingReport?.toBed || 0) + formData.toBed;
    const currentWakeUpTotal = weeklyTotals.wakeUp - (existingReport?.wakeUp || 0) + formData.wakeUp;
    const currentDailyFillingTotal = weeklyTotals.dailyFilling - (existingReport?.dailyFilling || 0) + formData.dailyFilling;
    const currentDaySleepTotal = weeklyTotals.daySleep - (existingReport?.daySleep || 0) + formData.daySleep;

    // Weekly calculations (Monday to Sunday)
    const bodyPercent = ((currentToBedTotal + currentWakeUpTotal + currentDailyFillingTotal + currentDaySleepTotal) / 280) * 100;
    const soulPercent = ((currentJapaTotal + currentHearingTotal + currentReadingTotal) / 210) * 100;

    return {
      bodyPercent: Math.min(100, Math.max(0, Math.round(bodyPercent * 100) / 100)),
      soulPercent: Math.min(100, Math.max(0, Math.round(soulPercent * 100) / 100)),
      bodyTotal: currentToBedTotal + currentWakeUpTotal + currentDailyFillingTotal + currentDaySleepTotal,
      soulTotal: currentJapaTotal + currentHearingTotal + currentReadingTotal,
      japa: currentJapaTotal,
      hearing: currentHearingTotal,
      reading: currentReadingTotal,
      toBed: currentToBedTotal,
      wakeUp: currentWakeUpTotal,
      dailyFilling: currentDailyFillingTotal,
      daySleep: currentDaySleepTotal,
    };
  };

  const weeklyScores = calculateWeeklyScores();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>

          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">
              Loading your Sadhana...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-lg sm:text-xl font-serif text-orange-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-3 py-1">
            Daily Sadhana Report
          </h1>
          <p className="text-gray-700 text-base sm:text-lg font-medium">
            Record your spiritual practices and daily routine
          </p>
        </div>

        {/* Success Message */}
        {/* Success Message - Sticky Popup */}
        {success && (
          <div className="fixed top-20 right-4 z-50 animate-slideInRight">
            <div className="bg-white border-l-4 border-green-500 text-gray-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 ring-1 ring-black/5">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-lg">Success</h3>
                <p className="text-sm text-gray-600">{success}</p>
              </div>
              <button onClick={() => setSuccess('')} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-xl shadow-md flex items-center">
            <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 px-6 py-4 rounded-xl shadow-md">
            <p className="font-bold mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Validation Errors:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-7">
              {validationErrors.map((err, idx) => (
                <li key={idx} className="text-sm">{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Existing Report Notice */}
        {existingReport && (
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 px-6 py-4 rounded-xl shadow-md">
            <p className="font-semibold">
              📝 You have already submitted a report for this date. You can update it by modifying the fields and submitting again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-200 p-6">
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-orange-600" />
              Select Date <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              max={today}
              onChange={async (e) => {
                const newDate = e.target.value;
                setFormData({ ...formData, date: newDate });
                if (userData) {
                  const report = await getSadhanaReportByDate(userData.id, newDate);
                  if (report) {
                    setExistingReport(report);
                    setFormData({
                      date: typeof report.date === 'string' ? report.date : report.date.toISOString().split('T')[0],
                      japa: report.japa || 0,
                      hearing: report.hearing || 0,
                      reading: report.reading || 0,
                      bookName: report.bookName || '',
                      toBed: report.toBed || 0,
                      wakeUp: report.wakeUp || 0,
                      dailyFilling: report.dailyFilling || 0,
                      daySleep: report.daySleep || 0,
                    });
                  } else {
                    setExistingReport(null);
                    setFormData({
                      date: newDate,
                      japa: 0,
                      hearing: 0,
                      reading: 0,
                      bookName: '',
                      toBed: 0,
                      wakeUp: 0,
                      dailyFilling: 0,
                      daySleep: 0,
                    });
                  }
                  const totals = await getWeeklyTotals(userData.id, newDate);
                  setWeeklyTotals(totals);
                }
              }}
              className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
              required
            />
          </div>

          {/* Spiritual Practices (Soul) Section */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-200 p-6">
            <h2 className="text-2xl font-bold text-orange-700 mb-6 flex items-center">
              <BookOpen className="h-6 w-6 mr-3" />
              Spiritual Practices (Soul)
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Japa */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Japa (marks) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.japa}
                  onChange={(e) => setFormData({ ...formData, japa: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.japa} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.japa / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Hearing */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Hearing (marks) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.hearing}
                  onChange={(e) => setFormData({ ...formData, hearing: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.hearing} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.hearing / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Reading */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Reading (marks) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.reading}
                  onChange={(e) => setFormData({ ...formData, reading: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.reading} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.reading / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Book Name */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Book Name
                </label>
                <input
                  type="text"
                  value={formData.bookName}
                  onChange={(e) => setFormData({ ...formData, bookName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  placeholder="Enter book name (optional)"
                />
                <p className="text-xs text-gray-600 mt-2 italic">Optional field</p>
              </div>
            </div>
          </div>

          {/* Daily Routine (Body) Section */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-200 p-6">
            <h2 className="text-2xl font-bold text-orange-700 mb-6 flex items-center">
              <Clock className="h-6 w-6 mr-3" />
              Daily Routine (Body)
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* To Bed */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <Moon className="h-4 w-4 mr-2 text-orange-600" />
                  To Bed <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.toBed}
                  onChange={(e) => setFormData({ ...formData, toBed: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.toBed} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.toBed / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Wake Up */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <Sun className="h-4 w-4 mr-2 text-orange-600" />
                  Wake Up <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.wakeUp}
                  onChange={(e) => setFormData({ ...formData, wakeUp: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.wakeUp} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.wakeUp / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Daily Filling */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <Coffee className="h-4 w-4 mr-2 text-orange-600" />
                  Daily Filling <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.dailyFilling}
                  onChange={(e) => setFormData({ ...formData, dailyFilling: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.dailyFilling} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.dailyFilling / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Day Sleep */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <Bed className="h-4 w-4 mr-2 text-orange-600" />
                  Day Sleep <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.daySleep}
                  onChange={(e) => setFormData({ ...formData, daySleep: parseInt(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-medium transition-all"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max: 10/day, 70/week</span>
                  <span className="font-semibold text-orange-700">
                    Weekly: {weeklyScores.daySleep} / 70
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (weeklyScores.daySleep / 70) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Score Display */}
          <div className="bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 border-2 border-orange-300 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <h3 className="font-bold text-lg sm:text-xl md:text-2xl text-orange-800 mb-4 sm:mb-6 flex items-center">
              <span className="mr-2 sm:mr-3 text-2xl sm:text-3xl">📊</span>
              Weekly Progress (Monday to Sunday)
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Soul Percentage */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border-2 border-orange-200">
                <p className="text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 uppercase tracking-wide">Soul Progress</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                  {weeklyScores.soulPercent.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2 sm:mb-3">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all shadow-md"
                    style={{ width: `${weeklyScores.soulPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">
                  Total: {weeklyScores.soulTotal} / 210 marks
                </p>
                <p className="text-xs text-gray-500 italic">
                  (Japa + Hearing + Reading) / 210 × 100
                </p>
              </div>

              {/* Body Percentage */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border-2 border-orange-200">
                <p className="text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2 uppercase tracking-wide">Body Progress</p>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3">
                  {weeklyScores.bodyPercent.toFixed(1)}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all shadow-md"
                    style={{ width: `${weeklyScores.bodyPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mb-1 font-semibold">
                  Total: {weeklyScores.bodyTotal} / 280 marks
                </p>
                <p className="text-xs text-gray-500 italic">
                  (To Bed + Wake Up + Daily Filling + Day Sleep) / 280 × 100
                </p>
              </div>
            </div>

            {/* Note */}
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
              <p className="text-sm text-yellow-900 font-medium">
                <strong>📌 Note:</strong> Calculations are based on weekly totals (Monday to Sunday) for the week containing the selected date.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-700 hover:via-orange-800 hover:to-amber-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            <Upload className="h-6 w-6 mr-3" />
            {submitting ? 'Submitting...' : existingReport ? 'Update Report' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
