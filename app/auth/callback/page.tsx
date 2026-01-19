'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to check if user record exists
  // Returns true if user needs to complete profile (user missing or incomplete), false otherwise
  const createUserRecordIfNeeded = async (user: any): Promise<boolean> => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, state, city, center, initiation_status, ashram, brahmachari_counselor')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return false;
    }

    if (existingUser) {
      // Check if user has completed all required fields
      const hasRequiredFields =
        existingUser.state &&
        existingUser.city &&
        existingUser.center &&
        existingUser.initiation_status &&
        existingUser.ashram &&
        existingUser.brahmachari_counselor;

      // Return true if fields are missing (needs completion)
      return !hasRequiredFields;
    }

    // User does not exist in users table.
    // We DO NOT create the record here anymore (per user request).
    // The record will be created when they submit the Complete Profile form.
    return true; // Redirect to complete-profile
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL parameters
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // console.log('OAuth Callback - Code:', code ? 'Present' : 'Missing');
        // console.log('OAuth Callback - Error:', errorParam);
        // console.log('OAuth Callback - Full URL:', window.location.href);

        // Check for OAuth errors
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          router.push(`/auth/login?error=oauth_error&details=${encodeURIComponent(errorDescription || errorParam)}`);
          return;
        }

        if (!supabase) {
          throw new Error('Supabase is not initialized');
        }

        if (!code) {
          // console.log('No code parameter - checking if session exists (hash-based redirect)');
          // Supabase might have already processed the OAuth and set the session
          // This happens when using hash-based redirects
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
          }

          if (session) {
            // console.log('Session found from hash redirect, user ID:', session.user?.id);
            // Session exists, now create user record if needed
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) {
              console.error('Error getting user:', userError);
              router.push('/dashboard');
              return;
            } else if (user) {
              // Wait for user record creation to complete
              const needsCompletion = await createUserRecordIfNeeded(user);

              if (needsCompletion) {
                router.push('/auth/complete-profile');
                return;
              }

              // Check if existing user needs to complete profile
              const { data: userData } = await supabase
                .from('users')
                .select('state, city, center, initiation_status, ashram, brahmachari_counselor')
                .eq('id', user.id)
                .single();

              if (userData) {
                const hasRequiredFields =
                  userData.state &&
                  userData.city &&
                  userData.center &&
                  userData.initiation_status &&
                  userData.ashram &&
                  userData.brahmachari_counselor;

                if (!hasRequiredFields) {
                  router.push('/auth/complete-profile');
                  return;
                }
              }
            }

            // Redirect after user creation
            router.push('/dashboard');
            return;
          }

          // No session and no code - this is an error
          console.error('No authorization code and no session found');
          setError('No authorization code received');
          setTimeout(() => {
            router.push('/auth/login?error=oauth_error&details=No authorization code received');
          }, 2000);
          return;
        }

        // Exchange code for session
        // console.log('Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Error exchanging code:', exchangeError);
          throw new Error(exchangeError.message || 'Failed to exchange authorization code');
        }

        if (!data.session) {
          throw new Error('No session created after code exchange');
        }

        // console.log('Session created successfully');
        // console.log('Session user ID:', data.session.user?.id);

        // Get the user from the session and create user record
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting user:', userError);
        } else if (user) {
          // Wait for user record creation to complete
          const needsCompletion = await createUserRecordIfNeeded(user);

          if (needsCompletion) {
            router.push('/auth/complete-profile');
            return;
          }

          // Check if existing user needs to complete profile
          const { data: userData } = await supabase
            .from('users')
            .select('state, city, center, initiation_status, ashram, brahmachari_counselor')
            .eq('id', user.id)
            .single();

          if (userData) {
            const hasRequiredFields =
              userData.state &&
              userData.city &&
              userData.center &&
              userData.initiation_status &&
              userData.ashram &&
              userData.brahmachari_counselor;

            if (!hasRequiredFields) {
              router.push('/auth/complete-profile');
              return;
            }
          }
        }

        // Redirect after user creation
        router.push('/dashboard');
      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'An error occurred during authentication');
        setTimeout(() => {
          router.push(`/auth/login?error=oauth_error&details=${encodeURIComponent(err.message || 'Authentication failed')}`);
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all hover:scale-[1.01] duration-500">
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
            </div>

            <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
              Hare Krishna
            </h2>

            <div className="space-y-2">
              <p className="text-xl text-gray-800 font-serif">
                We are creating your profile
              </p>
              <p className="text-sm text-orange-600/80 font-medium tracking-widest uppercase animate-pulse">
                Please wait...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-600 text-xl font-semibold mb-2">Authentication Error</div>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
