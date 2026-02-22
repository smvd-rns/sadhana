'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import {
    fetchSadhanaReportByDate,
    fetchSadhanaReportsByRange,
    submitSadhanaReportApi
} from '@/lib/api/sadhana-client';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Flame,
    Heart,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface SadhanaFormData {
    date: string;
    japa: number;
    hearing: number;
    reading: number;
    toBed: number;
    wakeUp: number;
    dailyFilling: number;
    daySleep: number;
}

const initialFormData: SadhanaFormData = {
    date: format(new Date(), 'yyyy-MM-dd'),
    japa: 0,
    hearing: 0,
    reading: 0,
    toBed: 0,
    wakeUp: 0,
    dailyFilling: 0,
    daySleep: 0,
};

// Helper to calculate scores from report list
const calculateWeeklyScoresFromReports = (reports: any[]) => {
    let japaTotal = 0;
    let hearingTotal = 0;
    let readingTotal = 0;
    let toBedTotal = 0;
    let wakeUpTotal = 0;
    let dailyFillingTotal = 0;
    let daySleepTotal = 0;

    reports.forEach(report => {
        japaTotal += Number(report.japa || 0);
        hearingTotal += Number(report.hearing || 0);
        readingTotal += Number(report.reading || 0);
        toBedTotal += Number(report.toBed || 0);
        wakeUpTotal += Number(report.wakeUp || 0);
        dailyFillingTotal += Number(report.dailyFilling || 0);
        daySleepTotal += Number(report.daySleep || 0);
    });

    const bodyPercentRaw = ((Math.min(70, toBedTotal) + Math.min(70, wakeUpTotal) + Math.min(70, dailyFillingTotal) + Math.min(70, daySleepTotal)) / 280) * 100;
    const soulPercentRaw = ((Math.min(70, japaTotal) + Math.min(70, hearingTotal) + Math.min(70, readingTotal)) / 210) * 100;

    return {
        soul: Math.round(Math.min(100, Math.max(0, soulPercentRaw))),
        body: Math.round(Math.min(100, Math.max(0, bodyPercentRaw)))
    };
};

export default function SadhanaPage() {
    const { user, userData } = useAuth();
    const [formData, setFormData] = useState<SadhanaFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [weeklyScores, setWeeklyScores] = useState({ soul: 0, body: 0 });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const getWeekDates = (date: string) => {
        const d = new Date(date);
        return {
            start: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            end: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        };
    };

    const loadData = useCallback(async () => {
        if (!userData?.id || !formData.date) return;

        setLoading(true);
        setError('');
        try {
            // 1. Fetch current day report
            const report = await fetchSadhanaReportByDate(formData.date, userData.id);
            if (report) {
                setFormData(prev => ({
                    ...prev,
                    japa: report.japa || 0,
                    hearing: report.hearing || 0,
                    reading: report.reading || 0,
                    toBed: report.toBed || 0,
                    wakeUp: report.wakeUp || 0,
                    dailyFilling: report.dailyFilling || 0,
                    daySleep: report.daySleep || 0,
                }));
            } else {
                setFormData(prev => ({
                    ...initialFormData,
                    date: prev.date,
                }));
            }

            // 2. Fetch all reports for the current week to calculate scores
            const { start, end } = getWeekDates(formData.date);
            const weeklyReports = await fetchSadhanaReportsByRange(start, end, userData.id);

            setWeeklyScores(calculateWeeklyScoresFromReports(weeklyReports));

        } catch (err: any) {
            console.error('Error loading sadhana data:', err);
            // Don't show error for 404/not found, just use empty form
        } finally {
            setLoading(false);
        }
    }, [formData.date, userData?.id]);

    useEffect(() => {
        loadData();
    }, [loadData, refreshTrigger]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.id) return;

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            await submitSadhanaReportApi({ ...formData, userId: userData.id });
            setSuccess('Sadhana report updated successfully! 🌟');

            // Optimistically update the UI score instantly
            const { start, end } = getWeekDates(formData.date);
            const currentReports = await fetchSadhanaReportsByRange(start, end, userData.id);

            // Filter out current date if it exists and inject fresh data
            const filteredReports = currentReports.filter((r: any) => r.date !== formData.date);
            filteredReports.push({ ...formData } as any);

            setWeeklyScores(calculateWeeklyScoresFromReports(filteredReports));

            // Sync background state
            setRefreshTrigger(prev => prev + 1);

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Error saving sadhana:', err);
            setError('Failed to save sadhana report. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDateChange = (newDate: string) => {
        setFormData(prev => ({ ...prev, date: newDate }));
    };

    const adjustDate = (days: number) => {
        const newDate = format(addDays(new Date(formData.date), days), 'yyyy-MM-dd');
        handleDateChange(newDate);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Date Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-orange-50">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 font-display tracking-tight flex items-center gap-3">
                        Daily <span className="text-orange-600">Sadhana</span> 📿
                    </h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">Track your spiritual progress daily</p>
                </div>

                <div className="flex items-center gap-2 bg-orange-50 p-1.5 rounded-2xl border border-orange-100">
                    <button
                        onClick={() => adjustDate(-1)}
                        className="p-2 hover:bg-white hover:text-orange-600 rounded-xl transition-all hover:shadow-sm"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-orange-900 font-bold text-sm min-w-[160px] justify-center">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 p-0 text-sm font-bold cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => adjustDate(1)}
                        className="p-2 hover:bg-white hover:text-orange-600 rounded-xl transition-all hover:shadow-sm"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Weekly Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 p-8 rounded-[2.5rem] shadow-2xl shadow-orange-200/50 text-white transform transition-all hover:scale-[1.02] duration-500">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                    <Heart className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-widest text-orange-100">Soul Nourishment</h3>
                                    <p className="text-sm text-white/80 font-medium">Japa, Hearing, Reading</p>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black tracking-tighter">{weeklyScores.soul}%</span>
                                <span className="text-orange-100 font-bold text-sm">this week</span>
                            </div>
                        </div>

                        <div className="relative h-28 w-28">
                            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                <circle className="text-white/20" stroke="currentColor" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                                <circle
                                    className="text-white transition-all duration-1000"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    strokeDasharray={`${weeklyScores.soul * 2.51} 251.2`}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    r="40" cx="50" cy="50"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200/50 text-white transform transition-all hover:scale-[1.02] duration-500">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                    <Flame className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-widest text-blue-100">Physical Discipline</h3>
                                    <p className="text-sm text-white/80 font-medium">Rest, Routine, Focus</p>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black tracking-tighter">{weeklyScores.body}%</span>
                                <span className="text-blue-100 font-bold text-sm">this week</span>
                            </div>
                        </div>

                        <div className="relative h-28 w-28">
                            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                <circle className="text-white/20" stroke="currentColor" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                                <circle
                                    className="text-white transition-all duration-1000"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    strokeDasharray={`${weeklyScores.body * 2.51} 251.2`}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    r="40" cx="50" cy="50"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-gray-100 space-y-12 relative overflow-hidden">
                {/* Success/Error Toasts */}
                {success && (
                    <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-4 rounded-2xl border border-emerald-100 animate-in zoom-in duration-300">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="font-bold">{success}</p>
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-3 bg-rose-50 text-rose-700 px-6 py-4 rounded-2xl border border-rose-100 animate-in zoom-in duration-300">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-bold">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Fetching your data...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Spiritual Activity Section */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-1.5 bg-orange-500 rounded-full"></div>
                                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Spiritual Growth</h2>
                                </div>

                                <div className="grid gap-6">
                                    {[
                                        { id: 'japa', label: 'Japa Rounds', color: 'bg-orange-50', icon: '📿' },
                                        { id: 'hearing', label: 'Hearing (min)', color: 'bg-amber-50', icon: '👂' },
                                        { id: 'reading', label: 'Reading (min)', color: 'bg-yellow-50', icon: '📖' },
                                    ].map((field) => (
                                        <div key={field.id} className={`${field.color} p-6 rounded-3xl border border-white shadow-sm hover:shadow-md transition-all`}>
                                            <label className="flex items-center justify-between mb-4">
                                                <span className="text-gray-700 font-bold flex items-center gap-2">
                                                    <span className="text-xl">{field.icon}</span> {field.label}
                                                </span>
                                                <span className="text-orange-600 font-black text-xs uppercase bg-white px-3 py-1 rounded-full border border-orange-100">Daily Target: 10/day</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={(formData as any)[field.id]}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: parseInt(e.target.value) || 0 }))}
                                                className="w-full bg-white border-2 border-orange-100/50 rounded-2xl py-4 px-6 text-2xl font-black text-gray-800 focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Physical Discipline Section */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-1.5 bg-blue-500 rounded-full"></div>
                                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Daily Discipline</h2>
                                </div>

                                <div className="grid gap-6">
                                    {[
                                        { id: 'toBed', label: 'To Bed Time', color: 'bg-blue-50', icon: '🌙' },
                                        { id: 'wakeUp', label: 'Wake Up Time', color: 'bg-cyan-50', icon: '☀️' },
                                        { id: 'dailyFilling', label: 'Refilling (min)', color: 'bg-sky-50', icon: '💧' },
                                        { id: 'daySleep', label: 'Day Sleep (min)', color: 'bg-indigo-50', icon: '🛋️' },
                                    ].map((field) => (
                                        <div key={field.id} className={`${field.color} p-6 rounded-3xl border border-white shadow-sm hover:shadow-md transition-all`}>
                                            <label className="flex items-center justify-between mb-4">
                                                <span className="text-gray-700 font-bold flex items-center gap-2">
                                                    <span className="text-xl">{field.icon}</span> {field.label}
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={(formData as any)[field.id]}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: parseInt(e.target.value) || 0 }))}
                                                className="w-full bg-white border-2 border-blue-100/50 rounded-2xl py-4 px-6 text-2xl font-black text-gray-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white py-6 rounded-3xl text-xl font-black uppercase tracking-widest shadow-2xl shadow-orange-200 hover:shadow-orange-300 transform transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <div className="flex items-center justify-center gap-4">
                                    {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                                    <span>{saving ? 'Saving Data...' : 'Save Performance Report'}</span>
                                </div>
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
