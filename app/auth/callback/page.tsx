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

  // Helper function to create user record if it doesn't exist
  // Returns true if user needs to complete profile, false otherwise
  const createUserRecordIfNeeded = async (user: any): Promise<boolean> => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    // console.log('Checking if user exists in users table...');
    // console.log('User ID:', user.id);
    // console.log('User email:', user.email);

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      console.error('Check error code:', checkError.code);
      console.error('Check error message:', checkError.message);
      return false;
    }

    if (existingUser) {
      // console.log('User already exists in users table');

      // Check if user has completed all required fields
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('state, city, center, initiation_status, ashram, brahmachari_counselor')
        .eq('id', user.id)
        .single();

      if (!fetchError && userData) {
        // Check if required fields are missing
        const hasRequiredFields =
          userData.state &&
          userData.city &&
          userData.center &&
          userData.initiation_status &&
          userData.ashram &&
          userData.brahmachari_counselor;

        // Return true if fields are missing (needs completion)
        return !hasRequiredFields;
      }

      // If we can't fetch user data, assume they need completion
      return true;
    }

    // console.log('User does not exist in users table, creating...');

    // Create user record directly using the authenticated client
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email?.toLowerCase() || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: [1], // Default role: student (role 1)
        state: null,
        city: null,
        center: null,
        hierarchy: {}, // Keep for backward compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, state, city, center, initiation_status, ashram, brahmachari_counselor')
      .single();

    if (insertError) {
      console.error('Error creating user record:', insertError);
      console.error('Insert error code:', insertError.code);
      console.error('Insert error message:', insertError.message);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));

      // If it's a duplicate error, user was created between check and insert
      if (insertError.code === '23505') {
        // console.log('User already exists (race condition)');
        // User was created between check and insert, check if they need completion
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

          return !hasRequiredFields;
        }
        return true;
      } else {
        // Try calling the API route as fallback (uses service role key)
        // console.log('Trying API route fallback...');
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const accessToken = currentSession?.access_token;

          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };

          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }

          const createUserResponse = await fetch('/api/users/create-from-auth', {
            method: 'POST',
            headers,
          });

          if (createUserResponse.ok) {
            const result = await createUserResponse.json();
            // console.log('✅ User record created via API route:', result);
            return true; // New user, needs completion
          } else {
            const errorData = await createUserResponse.json();
            console.error('❌ Failed to create user record via API:', errorData);
          }
        } catch (apiError: any) {
          console.error('❌ Error calling create-user API:', apiError);
        }
        return true; // Assume needs completion if error
      }
    } else {
      // console.log('✅ User record created successfully in users table:', insertedUser);
      // New user created - they need to complete profile
      return true; // Indicates redirect to completion form is needed
    }

    return false; // No redirect needed (should not reach here)
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
