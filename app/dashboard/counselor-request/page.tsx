'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { createCounselorRequest, getCounselorRequestByUserId, checkIfEmailIsCounselor } from '@/lib/supabase/counselor-requests';
import { sanitizeText } from '@/lib/utils/sanitize';
import { CheckCircle, AlertCircle, Loader2, Send, UserCheck, RefreshCw } from 'lucide-react';
import MessagePreview from '@/components/ui/MessagePreview';

export default function CounselorRequestPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [isCounselorEmail, setIsCounselorEmail] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checkCounselorStatus = useCallback(async () => {
    if (!user || !userData) return;

    setLoading(true);
    try {
      // Check if user's email is in counselor table
      const isCounselor = await checkIfEmailIsCounselor(userData.email);
      setIsCounselorEmail(isCounselor);

      // Check if user already has a request
      const request = await getCounselorRequestByUserId(user.id);
      setExistingRequest(request);
    } catch (error: any) {
      console.error('Error checking counselor status:', error);
      // Don't show error if Firebase is just not ready yet
      if (!error.message?.includes('Firebase is not initialized')) {
        setError('Failed to check counselor status');
      }
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    // Add a small delay to ensure Firebase is initialized
    const timer = setTimeout(() => {
      checkCounselorStatus();
    }, 200);

    return () => clearTimeout(timer);
  }, [checkCounselorStatus]);

  // Auto-refresh when page comes into focus (in case status changed in another tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user && userData) {
        checkCounselorStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkCounselorStatus, user, userData]);

  // Poll for status updates if there's a pending request
  useEffect(() => {
    if (!existingRequest || existingRequest.status !== 'pending') {
      return;
    }

    // Poll every 5 seconds for pending requests
    const interval = setInterval(() => {
      if (user && userData) {
        checkCounselorStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [existingRequest, checkCounselorStatus, user, userData]);

  const handleRequest = async () => {
    if (!user || !userData) {
      setError('User information not available. Please try logging in again.');
      return;
    }

    if (!user.id) {
      setError('User ID not found. Please try logging in again.');
      return;
    }

    // Validate message
    if (!message.trim()) {
      setError('Please write about yourself to help super admin verify your request.');
      return;
    }

    setRequesting(true);
    setError('');
    setSuccess('');

    try {
      // Sanitize the message before sending
      const sanitizedMessage = sanitizeText(message);

      await createCounselorRequest(
        user.id,
        userData.email,
        userData.name,
        userData.email,
        sanitizedMessage
      );
      setSuccess('Counselor role request submitted successfully! Waiting for super admin approval.');
      setMessage(''); // Clear the message after successful submission

      // Refresh the request status
      await checkCounselorStatus();
    } catch (error: any) {
      setError(error.message || 'Failed to submit request');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // If user's email is not in counselor table, show message
  if (!isCounselorEmail) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Counselor Role Request</h1>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-gray-700">
              Your email address is not found in the counselor database.
              Only users whose email addresses are registered in the counselor table can request the counselor role.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user already has counselor role
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2) ||
    userRoles.includes('senior_counselor') || userRoles.includes(3);

  if (hasCounselorRole) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Counselor Role Active</h1>
          </div>
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-medium">
              You already have the counselor role. You can access the counselor page from the navigation menu.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/counselor')}
            className="mt-4 w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base"
          >
            Go to Counselor Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Request Counselor Role</h1>
          </div>
          <button
            onClick={checkCounselorStatus}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh status"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {existingRequest ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${existingRequest.status === 'approved'
                ? 'bg-green-50 border-green-200'
                : existingRequest.status === 'rejected'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {existingRequest.status === 'approved' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {existingRequest.status === 'rejected' && (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                {existingRequest.status === 'pending' && (
                  <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                )}
                <h3 className="font-semibold text-gray-800">
                  Request Status: {existingRequest.status.toUpperCase()}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Requested on: {new Date(existingRequest.requestedAt).toLocaleString()}
              </p>
              {existingRequest.reviewedAt && (
                <p className="text-sm text-gray-600">
                  Reviewed on: {new Date(existingRequest.reviewedAt).toLocaleString()}
                </p>
              )}
              {existingRequest.message && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Your Message:</p>
                  <MessagePreview message={existingRequest.message} maxLength={50} />
                </div>
              )}
              {existingRequest.status === 'rejected' && existingRequest.notes && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-800">{existingRequest.notes}</p>
                </div>
              )}
              {existingRequest.status !== 'rejected' && existingRequest.notes && (
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Admin Notes:</strong> {existingRequest.notes}
                </p>
              )}
            </div>

            {existingRequest.status === 'pending' && (
              <p className="text-gray-600">
                Your request is pending approval from the super admin. Please wait for review.
              </p>
            )}

            {existingRequest.status === 'rejected' && (
              <div className="space-y-4 mt-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-700 text-sm">
                    Your previous request was rejected. You can submit a new request with updated information.
                  </p>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                    Tell us about yourself <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">
                    Please write about your background, experience, and why you want to be a counselor.
                    This helps the super admin verify your request. (Max 2000 characters)
                  </p>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write about yourself, your background, experience, and why you want to be a counselor..."
                    rows={6}
                    maxLength={2000}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {message.length}/2000 characters
                  </p>
                </div>

                <button
                  onClick={handleRequest}
                  disabled={requesting || !message.trim()}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit New Request
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-700">
                Your email address ({userData?.email}) is registered in the counselor database.
                You can request the counselor role to access the counselor page and view students assigned to you.
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                Tell us about yourself <span className="text-red-500">*</span>
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mb-2">
                Please write about your background, experience, and why you want to be a counselor.
                This helps the super admin verify your request. (Max 2000 characters)
              </p>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write about yourself, your background, experience, and why you want to be a counselor..."
                rows={6}
                maxLength={2000}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {message.length}/2000 characters
              </p>
            </div>

            <button
              onClick={handleRequest}
              disabled={requesting || !message.trim()}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Request Counselor Role
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
