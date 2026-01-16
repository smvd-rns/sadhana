'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { createBCVoiceManagerRequest, getBCVoiceManagerRequestByUserId } from '@/lib/supabase/bc-voice-manager-requests';
import { sanitizeText } from '@/lib/utils/sanitize';
import { getCentersByLocationFromLocal, CenterData } from '@/lib/data/local-centers';
import { CheckCircle, AlertCircle, Loader2, Send, UserCheck, RefreshCw, Building2 } from 'lucide-react';
import MessagePreview from '@/components/ui/MessagePreview';
import RejectionModal from '@/components/ui/RejectionModal';
import BCVoiceManagerDashboard from '@/components/dashboard/BCVoiceManagerDashboard';

export default function BCVoiceManagerRequestPage() {
  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const hasRefreshedForApprovalRef = useRef(false);

  const checkRequestStatus = useCallback(async () => {
    if (!user || !userData) return;

    setLoading(true);
    try {
      const request = await getBCVoiceManagerRequestByUserId(user.id);
      setExistingRequest(request);

      // If request was just approved and we haven't refreshed yet, refresh user data to get updated roles
      if (request?.status === 'approved' && !hasRefreshedForApprovalRef.current) {
        hasRefreshedForApprovalRef.current = true;
        await refreshUserData();
      }
    } catch (error: any) {
      console.error('Error checking BC Voice Manager request status:', error);
      setError('Failed to check request status');
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    // Only check once on mount, not every time checkRequestStatus changes
    if (!user || !userData) return;

    const timer = setTimeout(() => {
      checkRequestStatus();
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userData?.email]); // Only depend on stable user identifiers

  // Load centers when component mounts
  useEffect(() => {
    const loadCenters = async () => {
      setLoadingCenters(true);
      try {
        const allCenters = await getCentersByLocationFromLocal();
        setCenters(allCenters);
      } catch (error) {
        console.error('Error loading centers:', error);
      } finally {
        setLoadingCenters(false);
      }
    };
    loadCenters();
  }, []);

  // Auto-refresh when page comes into focus
  useEffect(() => {
    const handleFocus = () => {
      if (user && userData) {
        checkRequestStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkRequestStatus, user, userData]);

  // Poll for status updates if there's a pending request
  useEffect(() => {
    // Don't poll if request is approved (dashboard will be shown)
    if (!existingRequest || existingRequest.status !== 'pending') {
      return;
    }

    const interval = setInterval(() => {
      if (user && userData) {
        checkRequestStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [existingRequest?.status, checkRequestStatus, user, userData]);

  // Stop all polling and effects when request is approved
  const isApproved = existingRequest?.status === 'approved';

  const handleRequest = async () => {
    if (!user || !userData) {
      setError('User information not available. Please try logging in again.');
      return;
    }

    if (!user.id) {
      setError('User ID not found. Please try logging in again.');
      return;
    }

    // Validate subject, message, and centers
    if (!subject.trim()) {
      setError('Please enter a subject for your request.');
      return;
    }

    if (!message.trim()) {
      setError('Please write about yourself to help super admin verify your request.');
      return;
    }

    if (selectedCenters.length === 0) {
      setError('Please select at least one center you want to manage.');
      return;
    }

    setRequesting(true);
    setError('');
    setSuccess('');

    try {
      const sanitizedSubject = sanitizeText(subject);
      const sanitizedMessage = sanitizeText(message);

      await createBCVoiceManagerRequest(
        user.id,
        userData.email,
        userData.name,
        sanitizedSubject,
        sanitizedMessage,
        selectedCenters
      );
      setSuccess('BC Voice Manager role request submitted successfully! Waiting for super admin approval.');
      setSubject('');
      setMessage('');
      setSelectedCenters([]);

      await checkRequestStatus();
    } catch (error: any) {
      setError(error.message || 'Failed to submit request');
    } finally {
      setRequesting(false);
    }
  };

  // Check if user has counselor role (role 2) or BC voice manager role (role 4)
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2);
  const hasBCVoiceManagerRole = userRoles.includes('bc_voice_manager') || userRoles.includes(4);

  useEffect(() => {
    if (!userData || !user) return;

    // Check if user has counselor role (role 2) or BC voice manager role (role 4)
    if (!hasCounselorRole && !hasBCVoiceManagerRole) {
      router.push('/dashboard');
      return;
    }
  }, [userData, user, hasCounselorRole, hasBCVoiceManagerRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // Only role 2 (counselor) or role 4 (bc_voice_manager) can access this page
  if (!hasCounselorRole && !hasBCVoiceManagerRole) {
    return null;
  }

  // If request is approved, show dashboard instead of request status
  // The role should have been added when the request was approved
  if (existingRequest?.status === 'approved') {
    return <BCVoiceManagerDashboard key={user?.id || 'dashboard'} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Request BC Voice Manager Role</h1>
          </div>
          <button
            onClick={checkRequestStatus}
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
              {existingRequest.subject && (
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Subject:</strong> {existingRequest.subject}
                </p>
              )}
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
              {existingRequest.requestedCenters && existingRequest.requestedCenters.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Requested Centers:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingRequest.requestedCenters.map((centerId: string) => {
                      const center = centers.find(c => c.id === centerId || c.name === centerId);
                      return (
                        <span key={centerId} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {center ? `${center.name} (${center.city}, ${center.state})` : centerId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {existingRequest.approvedCenters && existingRequest.approvedCenters.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-2">Approved Centers:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingRequest.approvedCenters.map((centerId: string) => {
                      const center = centers.find(c => c.id === centerId || c.name === centerId);
                      return (
                        <span key={centerId} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {center ? `${center.name} (${center.city}, ${center.state})` : centerId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {existingRequest.status === 'rejected' && existingRequest.notes && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-800">{existingRequest.notes}</p>
                </div>
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
                  <label htmlFor="subject" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter a subject for your request..."
                    maxLength={200}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {subject.length}/200 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                    Tell us about yourself <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">
                    Please write about your background, experience, and why you want to be a BC Voice Manager.
                    This helps the super admin verify your request. (Max 2000 characters)
                  </p>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write about yourself, your background, experience, and why you want to be a BC Voice Manager..."
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
                  disabled={requesting || !subject.trim() || !message.trim() || selectedCenters.length === 0}
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
                Request the BC Voice Manager role to manage multiple centers and assign Voice Managers.
                You'll be able to view progress reports for all users under your centers.
              </p>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter a subject for your request..."
                maxLength={200}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {subject.length}/200 characters
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                Tell us about yourself <span className="text-red-500">*</span>
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mb-2">
                Please write about your background, experience, and why you want to be a BC Voice Manager.
                This helps the super admin verify your request. (Max 2000 characters)
              </p>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write about yourself, your background, experience, and why you want to be a BC Voice Manager..."
                rows={6}
                maxLength={2000}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {message.length}/2000 characters
              </p>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                Select Centers to Manage <span className="text-red-500">*</span>
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mb-3">
                Select the centers you want to manage as BC Voice Manager. You can select multiple centers.
              </p>
              {loadingCenters ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                  {centers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No centers available</p>
                  ) : (
                    centers.map((center) => (
                      <label
                        key={center.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCenters.includes(center.id) || selectedCenters.includes(center.name)}
                          onChange={(e) => {
                            const centerId = center.id || center.name;
                            if (e.target.checked) {
                              setSelectedCenters([...selectedCenters, centerId]);
                            } else {
                              setSelectedCenters(selectedCenters.filter(c => c !== centerId));
                            }
                          }}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">
                          {center.name} - {center.city}, {center.state}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
              {selectedCenters.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedCenters.length} center(s) selected
                </p>
              )}
            </div>

            <button
              onClick={handleRequest}
              disabled={requesting || !subject.trim() || !message.trim() || selectedCenters.length === 0}
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
                  Request BC Voice Manager Role
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
