'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithGoogle } from '@/lib/supabase/auth';
import { useAuth } from '@/components/providers/AuthProvider';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Only redirect if auth check is complete and user is authenticated
    // Don't redirect while still loading auth state
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Check for error in URL params (from OAuth callback)
    const urlError = searchParams.get('error');
    const errorDetails = searchParams.get('details');

    if (urlError) {
      if (urlError === 'oauth_error') {
        let errorMessage = 'Failed to sign in with Google. Please try again.';
        if (errorDetails) {
          // Provide more specific error messages
          if (errorDetails.includes('redirect_uri_mismatch')) {
            errorMessage = 'OAuth configuration error: Redirect URI mismatch. Please ensure the redirect URI is configured in Google Cloud Console.';
          } else if (errorDetails.includes('access_denied')) {
            errorMessage = 'Access denied. Please grant the necessary permissions.';
          } else {
            errorMessage = `Failed to sign in with Google: ${errorDetails}`;
          }
        }
        setError(errorMessage);
      } else if (urlError === 'configuration') {
        setError('Authentication configuration error. Please contact support.');
      } else {
        setError('An error occurred. Please try again.');
      }
      // Clean up URL
      router.replace('/auth/login');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setGoogleLoading(true);

    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        throw new Error((error as any).message || 'Failed to initiate Google sign-in');
      }

      // If we get a URL, redirect to it (this is the OAuth provider URL)
      if (data?.url) {
        window.location.href = data.url;
        // Don't set loading to false - we're redirecting
        return;
      }

      // If no URL, something went wrong
      throw new Error('No redirect URL received from OAuth provider');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>

          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated (will redirect via useEffect)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
            Hare Krishna
          </h2>

          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">
              Redirecting to dashboard...
            </p>
            <p className="text-sm text-orange-600/80 font-medium tracking-widest uppercase animate-pulse">
              Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-2 sm:px-4 md:px-6 py-3 sm:py-6 md:py-8 lg:py-12">
      <div className="max-w-md w-full bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl sm:shadow-2xl border border-amber-100 p-3 sm:p-6 md:p-8 lg:p-10 mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg mb-2 sm:mb-3 md:mb-4 lg:mb-5">
            <LogIn className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
          </div>
          <div className="mb-1.5 sm:mb-2 md:mb-3">
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-serif text-amber-700 font-semibold mb-0.5 sm:mb-1">
              Hare Krishna
            </p>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold font-serif bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-1.5 sm:mb-2 md:mb-3 px-1 sm:px-2">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-medium px-1 sm:px-2">
            Sign in to your account to continue
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 sm:mb-4 md:mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl shadow-md flex items-start space-x-2 sm:space-x-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <p className="flex-1 font-semibold text-xs sm:text-sm md:text-base break-words">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-3 sm:mb-4 md:mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl shadow-md flex items-start space-x-2 sm:space-x-3">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 text-green-600" />
            <p className="flex-1 font-semibold text-xs sm:text-sm md:text-base break-words">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white transition-all placeholder:text-gray-400 shadow-sm hover:border-amber-300"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:from-amber-700 hover:via-orange-700 hover:to-yellow-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {formLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span className="text-sm sm:text-base">Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 md:mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 sm:px-3 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || formLoading}
            className="mt-3 sm:mt-4 md:mt-5 w-full flex items-center justify-center gap-2 sm:gap-3 bg-white border-2 border-gray-200 text-gray-700 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-gray-600" />
                <span className="text-sm sm:text-base">Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm sm:text-base">Sign in with Google</span>
              </>
            )}
          </button>
        </div>



        {/* Hare Krishna Mahamantra */}
        <div className="mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-6 md:pt-8 border-t border-amber-200">
          <div className="text-center px-2">
            <p className="text-xs sm:text-sm text-amber-700 mb-3 sm:mb-4 md:mb-5 font-medium uppercase tracking-wide">Hare Krishna Mahamantra</p>
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-glow break-words drop-shadow-lg">
                Hare Krishna Hare Krishna
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-fade break-words drop-shadow-lg">
                Krishna Krishna Hare Hare
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-fade-delay-1 break-words drop-shadow-lg">
                Hare Rama Hare Rama
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg font-serif font-bold leading-relaxed animate-mantra-fade-delay-1-5 break-words drop-shadow-lg">
                Rama Rama Hare Hare
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
          </div>
          <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">Hare Krishna</h2>
          <div className="space-y-2">
            <p className="text-xl text-gray-800 font-serif">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
