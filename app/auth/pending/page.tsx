'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Clock, CheckCircle, Home, LogOut } from 'lucide-react';

export default function PendingApprovalPage() {
    const { user, userData, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If user is not logged in, redirect to login
        if (!loading && !user) {
            router.push('/auth/login');
            return;
        }

        // If user is approved, redirect to dashboard
        if (!loading && userData?.verificationStatus === 'approved') {
            router.push('/dashboard');
            return;
        }

        // If user has incomplete registration, redirect to complete registration
        if (!loading && (userData?.verificationStatus === 'incomplete' || userData?.verificationStatus === 'unverified')) {
            router.push('/auth/complete-registration');
            return;
        }
    }, [user, userData, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    {/* Animated Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-200 rounded-full animate-ping opacity-75"></div>
                            <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 rounded-full p-6">
                                <Clock className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Approval Pending
                    </h1>

                    {/* Message */}
                    <div className="space-y-4 mb-8">
                        <p className="text-gray-600 text-lg">
                            Thank you for registering, <span className="font-semibold text-orange-600">{user?.email}</span>!
                        </p>
                        <p className="text-gray-600">
                            Your registration has been submitted successfully and is currently under review by our administrators.
                        </p>

                        {/* Info Box */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-orange-800 mb-1">What happens next?</p>
                                    <ul className="text-sm text-orange-700 space-y-1">
                                        <li>• Admin will review your registration</li>
                                        <li>&bull; You&apos;ll receive access once approved</li>
                                        <li>• This usually takes 24-48 hours</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                        <Clock className="w-4 h-4" />
                        Status: Pending Approval
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {/* Go to Home Button */}
                        <button
                            onClick={() => router.push('/')}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Home className="w-5 h-5" />
                            Go to Home
                        </button>

                        {/* Sign Out Button */}
                        <button
                            onClick={handleSignOut}
                            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>

                    {/* Check Status Link */}
                    <div className="mt-6">
                        <button
                            onClick={() => window.location.reload()}
                            className="text-sm text-orange-600 hover:text-orange-800 underline"
                        >
                            Check Status Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
