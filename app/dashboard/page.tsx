'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserSadhanaReports } from '@/lib/supabase/sadhana';
import { getUserMessages } from '@/lib/supabase/messages';
import { SadhanaReport, Message } from '@/types';
import { BookOpen, MessageSquare, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { userData } = useAuth();
  const [recentReports, setRecentReports] = useState<SadhanaReport[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (userData) {
        const reports = await getUserSadhanaReports(userData.id, 5);
        const messages = await getUserMessages(userData.id, 10);
        setRecentReports(reports);
        setUnreadMessages(messages.filter(m => !m.readBy.includes(userData.id)));
        setLoading(false);
      }
    };
    loadData();
  }, [userData]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayReport = recentReports.find(r => {
    const reportDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
    return reportDate === todayStr;
  });

  const stats = [
    {
      name: 'Today\'s Report',
      value: todayReport ? 'Submitted' : 'Pending',
      icon: BookOpen,
      color: todayReport ? 'text-green-600' : 'text-yellow-600',
      href: '/dashboard/sadhana',
    },
    {
      name: 'Unread Messages',
      value: unreadMessages.length.toString(),
      icon: MessageSquare,
      color: 'text-blue-600',
      href: '/dashboard/messages',
    },
    {
      name: 'View Progress',
      value: recentReports.length.toString(),
      icon: TrendingUp,
      color: 'text-purple-600',
      href: '/dashboard/progress',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
            Welcome back, {userData?.name}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
            Here's your spiritual practice overview
          </p>
        </div>

        {/* Stats Grid - 3 cards in a row on mobile */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 md:p-6 hover:shadow-2xl transition-all transform hover:scale-[1.02]"
              >
                <div className="flex flex-col items-center text-center">
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 ${stat.color} mb-2 sm:mb-3`} />
                  <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">{stat.name}</p>
                  <p className={`text-lg sm:text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-orange-700 mb-4 sm:mb-6 flex items-center">
            <span className="mr-2 sm:mr-3 text-xl sm:text-2xl">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/dashboard/sadhana"
              className="flex items-center p-3 sm:p-4 border-2 border-orange-200 rounded-lg sm:rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all transform hover:scale-[1.02]"
            >
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">Submit Today's Sadhana</p>
                <p className="text-xs sm:text-sm text-gray-600">Record your daily spiritual practices</p>
              </div>
            </Link>
            <Link
              href="/dashboard/messages"
              className="flex items-center p-3 sm:p-4 border-2 border-orange-200 rounded-lg sm:rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all transform hover:scale-[1.02]"
            >
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">View Messages</p>
                <p className="text-xs sm:text-sm text-gray-600">Check communications from mentors</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        {recentReports.length > 0 && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-orange-700 flex items-center">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                Recent Sadhana Reports
              </h2>
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                {(() => {
                  const avgSoul = recentReports.slice(0, 5).length > 0
                    ? (recentReports.slice(0, 5).reduce((sum, r) => sum + (r.soulPercent || 0), 0) / recentReports.slice(0, 5).length)
                    : 0;
                  const avgBody = recentReports.slice(0, 5).length > 0
                    ? (recentReports.slice(0, 5).reduce((sum, r) => sum + (r.bodyPercent || 0), 0) / recentReports.slice(0, 5).length)
                    : 0;

                  let rating = '';
                  let ratingBg = '';
                  let ratingText = '';

                  if (avgSoul >= 80) {
                    rating = 'Excellent';
                    ratingBg = 'bg-primary-100'; // Changed to primary/theme consistent color if needed, or keep green
                    ratingBg = 'bg-green-100';
                    ratingText = 'text-green-700';
                  } else if (avgSoul >= 50) {
                    rating = 'Good'; // Shortened text
                    ratingBg = 'bg-blue-100';
                    ratingText = 'text-blue-700';
                  } else {
                    rating = 'Improve'; // Shortened text
                    ratingBg = 'bg-red-100';
                    ratingText = 'text-red-700';
                  }

                  return (
                    <>
                      <div className={`${ratingBg} px-2 py-1 rounded-lg border ${ratingBg.replace('100', '200')} flex-shrink-0`}>
                        <p className={`text-xs font-semibold ${ratingText} whitespace-nowrap`}>
                          {rating}
                        </p>
                      </div>
                      <div className="bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 flex-shrink-0">
                        <p className="text-xs font-semibold text-orange-700 whitespace-nowrap">
                          Soul: {avgSoul.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-purple-100 px-2 py-1 rounded-lg border border-purple-200 flex-shrink-0">
                        <p className="text-xs font-semibold text-purple-700 whitespace-nowrap">
                          Body: {avgBody.toFixed(1)}%
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {recentReports.slice(0, 5).map((report) => {
                const reportDate = report.date instanceof Date ? report.date : new Date(report.date);
                return (
                  <div key={report.id} className="flex items-center justify-between p-3 sm:p-4 bg-orange-50 rounded-lg sm:rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">{reportDate.toLocaleDateString()}</p>
                      <p className="text-xs sm:text-sm text-gray-700 mt-1">
                        Japa: {report.japa || 0} • Hearing: {report.hearing || 0} • Reading: {report.reading || 0}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Body: {report.bodyPercent ? `${report.bodyPercent.toFixed(1)}%` : '—'} • Soul: {report.soulPercent ? `${report.soulPercent.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 ml-2 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
