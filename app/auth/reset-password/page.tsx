'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/components/providers/AuthProvider';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Check if we have a valid recovery token for password reset
    const checkRecoveryToken = async () => {
      if (!supabase) {
        setError('Supabase is not initialized');
        setVerifying(false);
        return;
      }

      try {
        // Check URL hash for recovery token (Supabase puts it there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Check query parameters as well (some flows use query params)
        const searchParams = new URLSearchParams(window.location.search);
        const queryToken = searchParams.get('access_token');
        const queryType = searchParams.get('type');

        const token = accessToken || queryToken;
        const tokenType = type || queryType;

        // If we have a recovery token, set the session
        if (token && tokenType === 'recovery') {
          console.log('Recovery token found, setting session...');
          
          // Set the session with the recovery tokens
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Error setting recovery session:', sessionError);
              setError('Invalid or expired reset link. Please request a new password reset.');
              setVerifying(false);
              return;
            }
          } else if (token) {
            // Try to verify the token
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            if (userError || !user) {
              setError('Invalid or expired reset link. Please request a new password reset.');
              setVerifying(false);
              return;
            }
            // Token is valid, we can proceed
          }
        }

        // Check if we now have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        if (!session && !token) {
          setError('Invalid or expired reset link. Please request a new password reset.');
          setVerifying(false);
          return;
        }

        // Session exists or token is valid, allow password reset
        console.log('Valid recovery session/token, allowing password reset');
        setVerifying(false);
      } catch (err: any) {
        console.error('Error checking recovery token:', err);
        setError('Failed to verify reset link. Please request a new password reset.');
        setVerifying(false);
      }
    };

    checkRecoveryToken();
  }, []);

  // Don't redirect if user is logged in - they might be here to reset password
  // We'll sign them out after password reset anyway

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not initialized');
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Sign out the user after password reset (for security)
      // This ensures they need to log in again with the new password
      await supabase.auth.signOut();

      setSuccess('Password updated successfully! Please sign in with your new password.');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-primary-700 mb-2">
          Reset Password
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Enter your new password
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
