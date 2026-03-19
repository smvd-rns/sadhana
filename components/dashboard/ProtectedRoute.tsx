'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2, Flower } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      console.log('ProtectedRoute Check:', {
        user: !!user,
        userData: !!userData,
        verificationStatus: userData?.verificationStatus,
        name: !!userData?.name
      });

      if (!user) {
        console.log('ProtectedRoute Redirecting to Login - No user');
        router.push('/auth/login');
      } else if (!userData) {
        // Redirect to registration if user exists but profile data is missing (new user)
        router.push('/auth/complete-registration');
      } else if (userData?.verificationStatus === 'incomplete' || userData?.verificationStatus === 'unverified') {
        // Redirect to registration if profile is incomplete
        router.push('/auth/complete-registration');
      } else if (userData?.verificationStatus === 'pending') {
        // Redirect to pending approval page if status is pending
        router.push('/auth/pending');
      } else if (userData?.verificationStatus === 'rejected') {
        // Redirect to registration if rejected (to see reason and update)
        router.push('/auth/complete-registration');
      }
    }
  }, [user, userData, loading, router]);

  // Helper precise loading UI to avoid repetition
  const LoadingScreen = ({ message }: { message: string }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-600 via-orange-600 to-red-600">
      <div className="absolute inset-0 opacity-10 mix-blend-overlay"></div>

      <div className="relative z-10 p-8 bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-sm w-full mx-4 text-center transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="bg-white/20 p-3 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center backdrop-blur-sm shadow-inner">
          <Flower className="w-8 h-8 text-white animate-spin-slow" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-white mb-2">VOICE Gurukul</h2>

        <div className="flex items-center justify-center gap-3 text-orange-50 font-medium bg-black/10 py-2 px-4 rounded-full w-fit mx-auto mt-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{message}</span>
        </div>

        <p className="text-orange-100 text-sm mt-6 opacity-80">
          Securely accessing your dashboard
        </p>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingScreen message="Verifying your profile..." />;
  }

  // Block access if no user - show loading while redirect happens
  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Block access if user exists but no profile data
  if (!userData) {
    return <LoadingScreen message="Redirecting to registration..." />;
  }

  // Block access if profile is incomplete - show loading while redirect happens
  if (userData?.verificationStatus === 'incomplete') {
    return <LoadingScreen message="Redirecting to registration..." />;
  }

  // Block access if verification is pending - show loading while redirect happens
  if (userData?.verificationStatus === 'pending') {
    return <LoadingScreen message="Redirecting to pending status..." />;
  }

  // Block access if rejected or unverified
  if (userData?.verificationStatus === 'rejected' || userData?.verificationStatus === 'unverified') {
    return <LoadingScreen message="Redirecting to registration..." />;
  }

  return <>{children}</>;
}
