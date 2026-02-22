'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/config';
import {
    fetchSadhanaReportByDate,
    fetchSadhanaReportsByRange,
    submitSadhanaReportApi
} from '@/lib/api/sadhana-client';
import { Calendar, ChevronLeft, ChevronRight, Save, Loader2, CheckCircle2, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface SadhanaFormData {
    date: string;
    japa: number;
    hearing: number;
    reading: number;
    bookName: string;
    toBed: number;
    wakeUp: number;
    dailyFilling: number;
    daySleep: number;
}

const initialFormData: SadhanaFormData = {
    date: format(new Date(), 'yyyy-MM-dd'),
    japa: 0, hearing: 0, reading: 0, bookName: '',
    toBed: 0, wakeUp: 0, dailyFilling: 0, daySleep: 0,
};

const TILES = [
    { id: 'japa', label: 'Japa', icon: '📿', sub: 'rounds', target: 16, targetLabel: '16/day', bg: 'from-orange-400 to-rose-500', border: 'border-orange-200', inputColor: 'text-orange-600', badgeBg: 'bg-orange-50', tagBg: 'bg-orange-100 text-orange-700' },
    { id: 'hearing', label: 'Hearing', icon: '👂', sub: 'minutes', target: 30, targetLabel: '30/day', bg: 'from-amber-400  to-yellow-500', border: 'border-amber-200', inputColor: 'text-amber-600', badgeBg: 'bg-amber-50', tagBg: 'bg-amber-100  text-amber-700' },
    { id: 'reading', label: 'Reading', icon: '📖', sub: 'minutes', target: 30, targetLabel: '30/day', bg: 'from-lime-400   to-emerald-500', border: 'border-lime-200', inputColor: 'text-emerald-600', badgeBg: 'bg-lime-50', tagBg: 'bg-lime-100   text-lime-700' },
    { id: 'toBed', label: 'To Bed', icon: '🌙', sub: 'minutes', target: 10, targetLabel: '10/day', bg: 'from-blue-400   to-indigo-500', border: 'border-blue-200', inputColor: 'text-blue-600', badgeBg: 'bg-blue-50', tagBg: 'bg-blue-100   text-blue-700' },
    { id: 'wakeUp', label: 'Wake Up', icon: '☀️', sub: 'minutes', target: 10, targetLabel: '10/day', bg: 'from-cyan-400   to-sky-500', border: 'border-cyan-200', inputColor: 'text-cyan-600', badgeBg: 'bg-cyan-50', tagBg: 'bg-cyan-100   text-cyan-700' },
    { id: 'dailyFilling', label: 'Refilling', icon: '💧', sub: 'minutes', target: 10, targetLabel: '10/day', bg: 'from-sky-400    to-blue-500', border: 'border-sky-200', inputColor: 'text-sky-600', badgeBg: 'bg-sky-50', tagBg: 'bg-sky-100    text-sky-700' },
    { id: 'daySleep', label: 'Day Sleep', icon: '🛋️', sub: 'minutes', target: 10, targetLabel: '10/day', bg: 'from-violet-400 to-purple-500', border: 'border-violet-200', inputColor: 'text-violet-600', badgeBg: 'bg-violet-50', tagBg: 'bg-violet-100 text-violet-700' },
] as const;

export default function SadhanaPage() {
    const { userData } = useAuth();
    const [form, setForm] = useState<SadhanaFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const loadData = useCallback(async () => {
        if (!userData?.id || !form.date) return;
        setLoading(true); setError('');
        try {
            const report = await fetchSadhanaReportByDate(form.date, userData.id);
            if (report) {
                setForm(p => ({
                    ...p,
                    japa: report.japa || 0,
                    hearing: report.hearing || 0,
                    reading: report.reading || 0,
                    bookName: (report as any).bookName || '',
                    toBed: report.toBed || 0,
                    wakeUp: report.wakeUp || 0,
                    dailyFilling: report.dailyFilling || 0,
                    daySleep: report.daySleep || 0,
                }));
            } else {
                setForm(p => ({ ...initialFormData, date: p.date }));
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [form.date, userData?.id]);

    useEffect(() => { loadData(); }, [loadData, refreshTrigger]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.id) return;
        setSaving(true); setError(''); setSuccess('');
        try {
            await submitSadhanaReportApi({ ...form, userId: userData.id } as any);
            setSuccess('Sadhana report saved! 🌟');
            setRefreshTrigger(p => p + 1);
            setTimeout(() => setSuccess(''), 4000);
        } catch {
            setError('Failed to save. Please try again.');
        } finally { setSaving(false); }
    };

    const shiftDate = (days: number) =>
        setForm(p => ({ ...p, date: format(addDays(new Date(p.date), days), 'yyyy-MM-dd') }));

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isToday = form.date === todayStr;

    return (
        <div className="max-w-3xl mx-auto space-y-4 px-2 sm:px-0 pb-6">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden rounded-2xl shadow-xl shadow-orange-200/40 bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 px-5 py-4">
                <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="h-3.5 w-3.5 text-yellow-200" />
                            <span className="text-xs font-bold text-orange-100 uppercase tracking-widest">Hare Krishna</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Daily Sadhana 📿</h1>
                        <p className="text-sm text-orange-100 mt-0.5 font-medium">
                            {isToday ? "Record today's spiritual practices" : `Report for ${format(new Date(form.date + 'T12:00:00'), 'EEEE, MMM d yyyy')}`}
                        </p>
                    </div>

                    {/* Date navigator */}
                    <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm p-1 rounded-xl border border-white/10 self-start sm:self-auto flex-shrink-0">
                        <button type="button" onClick={() => shiftDate(-1)}
                            className="p-1.5 rounded-lg hover:bg-white/20 transition-all text-white/80 hover:text-white">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg">
                            <Calendar className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
                            <input
                                type="date" value={form.date}
                                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                className="bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-white cursor-pointer [color-scheme:dark]"
                            />
                        </div>
                        <button type="button" onClick={() => shiftDate(1)}
                            className="p-1.5 rounded-lg hover:bg-white/20 transition-all text-white/80 hover:text-white">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Status Banners ── */}
            {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold animate-in slide-in-from-top-2 duration-300 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold animate-in slide-in-from-top-2 duration-300 shadow-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                        <span className="text-sm font-semibold text-gray-500">Loading your data...</span>
                    </div>
                ) : (
                    <>
                        {/* ── Tile Grid — 4 cols on lg, 3 on sm, 2 on mobile ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {TILES.map(t => {
                                const val = (form as any)[t.id] as number;
                                const pct = Math.min(100, Math.round((val / t.target) * 100));
                                const met = val >= t.target;
                                return (
                                    <div
                                        key={t.id}
                                        className={`relative bg-white rounded-2xl border ${t.border} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}
                                    >
                                        {/* top gradient stripe */}
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${t.bg}`} />

                                        <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2">
                                            {/* icon + label row + target badge */}
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br ${t.bg} text-sm shadow-sm flex-shrink-0`}>
                                                        {t.icon}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-gray-700 uppercase tracking-wide leading-tight">{t.label}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{t.sub}</p>
                                                    </div>
                                                </div>
                                                {/* daily target badge */}
                                                <span className={`flex-shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full leading-tight ${met ? 'bg-emerald-100 text-emerald-700' : t.tagBg}`}>
                                                    {met ? '✓ Done' : t.targetLabel}
                                                </span>
                                            </div>

                                            {/* number input */}
                                            <input
                                                type="number"
                                                min="0"
                                                id={t.id}
                                                value={val}
                                                onChange={e => setForm(p => ({ ...p, [t.id]: parseInt(e.target.value) || 0 }))}
                                                className={`w-full ${t.badgeBg} border ${t.border} rounded-xl py-2 px-2 text-2xl font-black text-center ${t.inputColor} focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all`}
                                            />

                                            {/* mini progress bar */}
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${met ? 'from-emerald-400 to-teal-500' : t.bg}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className={`text-[10px] font-semibold text-center leading-none ${met ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {met ? '🎉 Target reached!' : `${pct}% of ${t.targetLabel}`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Book Currently Reading — full-width card ── */}
                        <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">
                            <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 to-emerald-500" />
                            <div className="px-4 py-3 flex items-center gap-3">
                                <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-sm flex-shrink-0 text-lg">📚</span>
                                <div className="flex-1">
                                    <label htmlFor="bookName" className="flex items-center gap-1.5 text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                                        <BookOpen className="h-3.5 w-3.5 text-teal-500" />
                                        Book Currently Reading
                                    </label>
                                    <input
                                        id="bookName"
                                        type="text"
                                        placeholder="e.g. Bhagavad Gita As It Is"
                                        value={form.bookName}
                                        onChange={e => setForm(p => ({ ...p, bookName: e.target.value }))}
                                        className="w-full bg-teal-50 border border-teal-200 rounded-xl py-2 px-3 text-sm font-semibold text-teal-900 placeholder-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Save Button ── */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:via-rose-600 hover:to-amber-600 text-white py-3.5 rounded-2xl text-base font-black uppercase tracking-wider shadow-lg shadow-orange-300/40 hover:shadow-xl hover:shadow-orange-300/50 transition-all disabled:opacity-60 active:scale-[0.99]"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            {saving ? 'Saving...' : 'Save Sadhana Report'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
