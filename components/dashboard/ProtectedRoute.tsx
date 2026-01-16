'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else if (
        !userData ||
        !userData.name ||
        !userData.hierarchy?.state ||
        !userData.hierarchy?.city ||
        !userData.hierarchy?.center
      ) {
        // Redirect to complete profile if mandatory fields are missing
        router.push('/auth/complete-profile');
      }
    }
  }, [user, userData, loading, router]);

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

  if (!user || (user && (!userData || !userData.name || !userData.hierarchy?.state || !userData.hierarchy?.city || !userData.hierarchy?.center))) {
    return null;
  }

  return <>{children}</>;
}
