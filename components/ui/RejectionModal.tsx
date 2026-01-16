'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userName: string;
}

export default function RejectionModal({ isOpen, onClose, onConfirm, userName }: RejectionModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim() || 'Rejected by super admin');
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-800">Reject Request</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Rejecting request from <strong>{userName}</strong>. Please provide a reason (optional):
          </p>
          
          <div className="mb-4">
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter rejection reason (optional)..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {reason.length}/500 characters
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Reject Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
