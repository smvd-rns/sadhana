'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-primary-700 mb-2">
          ISKCON Sadhana Platform
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Daily spiritual practice tracking and mentorship communication
        </p>
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="block w-full bg-white text-primary-600 text-center py-3 rounded-lg font-semibold border-2 border-primary-600 hover:bg-primary-50 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
