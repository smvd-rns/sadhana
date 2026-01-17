'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-orange-200/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-yellow-200/40 rounded-full blur-[100px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-amber-100/40 rounded-full blur-[80px]"></div>
      </div>

      {/* Mantra Animation Background - Subtle */}
      <div className="absolute inset-x-0 top-10 flex justify-center opacity-10 pointer-events-none overflow-hidden h-32">
        <div className="text-4xl md:text-6xl font-sanskrit text-orange-900 whitespace-nowrap animate-mantra-fade">
          Hare Krishna Hare Krishna Krishna Krishna Hare Hare
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-10 flex justify-center opacity-10 pointer-events-none overflow-hidden h-32">
        <div className="text-4xl md:text-6xl font-sanskrit text-orange-900 whitespace-nowrap animate-mantra-fade-delay-1">
          Hare Rama Hare Rama Rama Rama Hare Hare
        </div>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-md bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-10 transform transition-all duration-500 hover:shadow-2xl">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-full bg-gradient-to-br from-orange-100 to-yellow-50 mb-6 shadow-sm border border-orange-100/50">
            <svg
              className="w-12 h-12 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>

          <h1 className="text-4xl font-display font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-orange-700 to-amber-600 tracking-tight">
            ISKCON Sadhana
          </h1>
          <p className="text-orange-900/60 font-medium text-sm tracking-widest uppercase">
            Spiritual Practice & Mentorship
          </p>
        </div>

        {/* Description */}
        <p className="text-center text-gray-600 mb-10 leading-relaxed">
          Track your daily spiritual practices, connect with mentors, and grow in your Krishna consciousness journey with a purpose-built platform.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="group relative block w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 p-[1px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-orange-50"
          >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#F59E0B_0%,#EA580C_50%,#F59E0B_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:to-orange-600">
              Sign In
            </span>
          </Link>

          <Link
            href="/auth/register"
            className="block w-full"
          >
            <span className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-orange-200 bg-white/50 px-8 py-3.5 text-sm font-semibold text-orange-700 transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:border-orange-300 backdrop-blur-sm">
              Create Account
            </span>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center border-t border-orange-100 pt-6">
          <p className="text-xs text-orange-900/40">
            Chant Hare Krishna and be Happy
          </p>
        </div>
      </div>
    </div>
  );
}
