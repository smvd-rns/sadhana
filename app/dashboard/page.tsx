'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { getUserMessages } from '@/lib/supabase/messages';
import { SadhanaReport, Message } from '@/types';
import { BookOpen, MessageSquare, TrendingUp, Calendar, Zap, ArrowRight, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';

const QUOTES = [
  "Chanting the holy name is the primary spiritual practice for this age.",
  "Always remember Krishna and never forget Him.",
  "Tolerance and humility are the ornaments of a devotee.",
  "Patience and enthusiasm are key to spiritual success.",
  "Service to the devotees is the highest of all services."
];

export default function DashboardPage() {
  const { userData } = useAuth();
  const [recentReports, setRecentReports] = useState<SadhanaReport[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (userData) {
        const reports = await fetchSadhanaHistory(30);
        const messages = await getUserMessages(userData.id, 10);
        setRecentReports(reports);
        setUnreadMessages(messages.filter(m => !m.readBy.includes(userData.id)));
        setLoading(false);
      }
    };
    loadData();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReport = recentReports.find(r => {
    const reportDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
    return reportDate === todayStr;
  });

  // Calculate Streak
  let streak = 0;
  if (recentReports.length > 0) {
    const sorted = [...recentReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentCheckDate = new Date();
    const firstDateStr = new Date(sorted[0].date).toISOString().split('T')[0];
    if (firstDateStr !== todayStr) {
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    }

    for (const report of sorted) {
      const reportDateStr = (report.date instanceof Date ? report.date : new Date(report.date)).toISOString().split('T')[0];
      const checkDateStr = currentCheckDate.toISOString().split('T')[0];

      if (reportDateStr === checkDateStr) {
        streak++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const stats = [
    {
      name: 'Unread Messages',
      value: unreadMessages.length.toString(),
      icon: MessageSquare,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/25',
      href: '/dashboard/messages',
      subtext: unreadMessages.length > 0 ? 'Needs attention' : 'All caught up',
    },
    {
      name: 'Sadhana Streak',
      value: `${streak} Days`,
      icon: Zap,
      gradient: 'from-purple-500 to-pink-600',
      shadow: 'shadow-purple-500/25',
      href: '/dashboard/progress',
      subtext: streak > 0 ? 'Keep it up!' : 'Start today!',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 relative overflow-hidden via-orange-50/50 to-amber-50/30 py-6 sm:py-10 px-4 sm:px-6">
      {/* Background blobs for aesthetics */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-200/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-200/20 blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative z-10">

        {/* Hero Section */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] shadow-xl shadow-orange-900/5 border border-white/50 p-4 sm:p-10 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-orange-400/20 to-amber-300/20 blur-2xl sm:blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-24 h-24 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-rose-400/20 to-orange-300/20 blur-xl sm:blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-50 text-orange-800 text-[10px] sm:text-sm font-semibold mb-3 sm:mb-5 shadow-sm border border-orange-200/50">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                <span>Hare Krishna</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-2 sm:mb-3">
                {greeting}, <br className="sm:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">{userData?.name?.split(' ')[0] || 'Devotee'}</span>
              </h1>
              <div className="flex items-start gap-2 sm:gap-3 mt-3 sm:mt-5">
                <div className="mt-1 w-1 h-8 sm:h-12 bg-gradient-to-b from-orange-400 to-orange-200 rounded-full shrink-0" />
                <p className="text-xs sm:text-base text-slate-600 max-w-xl italic font-medium leading-relaxed">
                  "{quote}"
                </p>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center min-w-[120px] p-5 bg-gradient-to-b from-white to-orange-50/50 rounded-3xl border border-orange-100 shadow-sm">
              <div className="text-center">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-rose-500">{new Date().getDate()}</div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">{new Date().toLocaleString('default', { month: 'short' })}</div>
                <div className="text-xs font-semibold text-slate-400 mt-1">{new Date().getFullYear()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            // On mobile, the third card takes full width if there are 3 cards, but here we can just let it span or flow
            // Actually, a 3-col grid on mobile might be too tight, so 2 cols is better.
            const colSpan = i === 2 ? "col-span-2 sm:col-span-1" : "";
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className={`group relative overflow-hidden bg-white/60 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${stat.shadow} ${colSpan}`}
              >
                <div className={`absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-gradient-to-b ${stat.gradient}`} />
                <div className="flex justify-between items-start mb-3 sm:mb-6">
                  <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className="p-1.5 sm:p-2.5 bg-slate-100/50 text-slate-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all duration-300 transform group-hover:translate-x-1">
                    <ArrowRight className="w-3 h-3 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-slate-800 mb-1 sm:mb-2 tracking-tight">{stat.value}</h3>
                  <p className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase sm:normal-case">{stat.name}</p>
                  <p className="text-[9px] sm:text-xs text-slate-400 mt-1 sm:mt-2 font-medium bg-slate-100/50 inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{stat.subtext}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Activity & Quick Actions Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Recent Sadhana Feed (Takes up 2 columns on large screens) */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100/50 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-orange-100 to-amber-50 rounded-lg sm:rounded-xl border border-orange-200/50 shadow-sm">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Recent Sadhana</h2>
              </div>
              <Link href="/dashboard/progress" className="text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 sm:gap-1.5 transition-colors px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-orange-50 rounded-full">
                View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </Link>
            </div>

            <div className="p-3 sm:p-6 flex-1 flex flex-col justify-center">
              {recentReports.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentReports.slice(0, 4).map((report, idx) => {
                    const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
                    const isToday = reportDate.toISOString().split('T')[0] === todayStr;
                    const soul = report.soulPercent || 0;
                    const body = report.bodyPercent || 0;

                    return (
                      <div key={report.id} className="group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100/50 bg-white hover:bg-slate-50/80 transition-all hover:shadow-md cursor-default">
                        <div className="flex items-center gap-3 sm:gap-4 sm:w-[35%]">
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 flex flex-col items-center justify-center rounded-xl sm:rounded-2xl font-bold shrink-0 shadow-sm ${isToday ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-orange-500/20' : 'bg-slate-50 border border-slate-100 text-slate-600'}`}>
                            <span className="text-sm sm:text-lg leading-none mb-0.5">{reportDate.getDate()}</span>
                            <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider">{reportDate.toLocaleString('default', { month: 'short' })}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{isToday ? "Today" : reportDate.toLocaleDateString(undefined, { weekday: 'long' })}</p>
                            <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 font-semibold">
                              <span title="Japa rounds" className="flex items-center gap-0.5 sm:gap-1"><span className="text-orange-400">📿</span> {report.japa || 0}</span>
                              <span title="Hearing mins" className="flex items-center gap-0.5 sm:gap-1"><span className="text-blue-400">🎧</span> {report.hearing || 0}m</span>
                              <span title="Reading mins" className="flex items-center gap-0.5 sm:gap-1"><span className="text-emerald-400">📖</span> {report.reading || 0}m</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-2 sm:gap-3">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 w-8 uppercase tracking-wider">Soul</span>
                            <div className="flex-1 h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full rounded-full transition-all duration-1000 ${soul >= 80 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : soul >= 50 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-orange-400 to-rose-400'}`} style={{ width: `${soul}%` }} />
                            </div>
                            <span className="text-[10px] sm:text-xs font-black text-slate-700 w-8 text-right">{soul.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 w-8 uppercase tracking-wider">Body</span>
                            <div className="flex-1 h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full rounded-full transition-all duration-1000 delay-100 ${body >= 80 ? 'bg-gradient-to-r from-teal-400 to-emerald-500' : body >= 50 ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`} style={{ width: `${body}%` }} />
                            </div>
                            <span className="text-[10px] sm:text-xs font-black text-slate-700 w-8 text-right">{body.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner border border-orange-100/50">
                    <BookOpen className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Your Path Starts Here</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8 font-medium leading-relaxed">View your progress and streak on the Progress page.</p>
                  <Link href="/dashboard/progress" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all">
                    <Sparkles className="w-4 h-4" />
                    View Progress
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions (Takes up 1 column on large screens) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden relative flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/20 to-rose-500/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-indigo-500/5 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />

            <div className="p-7 border-b border-white/5 relative z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Zap className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                Quick Actions
              </h2>
              <Link href="/dashboard/sadhana" className="group flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-lg transition-all backdrop-blur-sm">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-orange-300 transition-colors">Submit Sadhana</h3>
                  <p className="text-xs text-slate-400 font-medium">Record today's practices</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

            </div>

            <div className="p-7 flex-1 flex flex-col gap-5 relative z-10">
              <Link href="/dashboard/messages" className="group flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-lg transition-all backdrop-blur-sm">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <MessageSquare className="w-7 h-7 text-white" />
                  {unreadMessages.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black border-2 border-slate-900">
                      {unreadMessages.length}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-blue-300 transition-colors">Messages</h3>
                  <p className="text-xs text-slate-400 font-medium">Connect with mentors</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>

              <div className="mt-auto pt-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-orange-500/20 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest">Inspiration</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 italic leading-relaxed">
                    "Service to the devotees is the highest of all services."
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
