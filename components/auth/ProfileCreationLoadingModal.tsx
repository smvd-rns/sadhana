'use client';

interface ProfileCreationLoadingModalProps {
  isOpen: boolean;
}

export default function ProfileCreationLoadingModal({ isOpen }: ProfileCreationLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300">
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
  );
}
