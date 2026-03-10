import { Metadata } from 'next'
import { Suspense } from 'react'
import RepositoryDashboard from './RepositoryDashboard'

export const metadata: Metadata = {
    title: 'Search Repository | Sarvajna',
    description: 'Search and access files from the global repository.',
}

export default function SearchRepositoryPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/10 via-amber-600/10 to-orange-600/10 mb-4 sm:mb-8">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                </div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
                    <div className="max-w-3xl">
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-clip-text text-transparent mb-3 sm:mb-4 animate-fade-in">
                            Search Repository
                        </h1>
                        <p className="text-base sm:text-xl text-gray-600 font-medium leading-relaxed animate-fade-in animation-delay-200">
                            Explore and access study materials shared by the community. Find everything you need in one place.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <Suspense fallback={<div className="text-center py-10 font-medium text-gray-500">Loading repository...</div>}>
                    <RepositoryDashboard />
                </Suspense>
            </div>
        </div>
    )
}
