'use client';

import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'success' | 'warning';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const handleClose = () => {
        if (!isLoading) onClose();
    };

    const colors = {
        danger: {
            bg: 'bg-red-50',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700',
            iconComponent: AlertCircle
        },
        success: {
            bg: 'bg-green-50',
            icon: 'text-green-600',
            button: 'bg-green-600 hover:bg-green-700',
            iconComponent: CheckCircle2
        },
        warning: {
            bg: 'bg-amber-50',
            icon: 'text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700',
            iconComponent: AlertTriangle
        }
    };

    const CurrentColor = colors[type];
    const Icon = CurrentColor.iconComponent;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full scale-100 animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="p-6 text-center">
                    <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-4 ${CurrentColor.bg}`}>
                        <Icon className={`w-6 h-6 ${CurrentColor.icon}`} />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                    </h3>

                    <p className="text-gray-500 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex border-t border-gray-100 bg-gray-50/50 p-4 gap-3">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 ${CurrentColor.button}`}
                    >
                        {isLoading && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
