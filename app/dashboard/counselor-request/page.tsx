'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CounselorRequestRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/counselor');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">Redirecting...</h2>
                <p className="text-gray-600">Please wait while we take you to the counselor dashboard.</p>
            </div>
        </div>
    );
}
