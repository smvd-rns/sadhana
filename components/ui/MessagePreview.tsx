'use client';

import { useState } from 'react';
import { Eye, X } from 'lucide-react';

interface MessagePreviewProps {
  message: string;
  maxLength?: number;
  className?: string;
}

export default function MessagePreview({ message, maxLength = 50, className = '' }: MessagePreviewProps) {
  const [showFull, setShowFull] = useState(false);
  const shouldTruncate = message.length > maxLength;
  const truncatedMessage = shouldTruncate ? message.substring(0, maxLength) + '...' : message;

  return (
    <>
      <div className={className}>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {truncatedMessage}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFull(true)}
            className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 underline hover:no-underline transition-all"
            type="button"
          >
            <Eye className="h-4 w-4" />
            View More
          </button>
        )}
      </div>

      {/* Full Message Modal */}
      {showFull && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFull(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Full Message</h3>
              <button
                onClick={() => setShowFull(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">{message}</p>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200">
              <button
                onClick={() => setShowFull(false)}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
