'use client';

import { useState, useRef } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, Music, Video, Link as LinkIcon, Plus } from 'lucide-react';
import { getActiveSadhanaSupabase } from '@/lib/supabase/sadhana';
import { ManagedEventAttachment } from '@/types';
import { toast } from 'react-hot-toast';

interface AttachmentPickerProps {
    attachments: ManagedEventAttachment[];
    onChange: (attachments: ManagedEventAttachment[]) => void;
}

export default function AttachmentPicker({ attachments, onChange }: AttachmentPickerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-4 w-4" />;
            case 'audio': return <Music className="h-4 w-4" />;
            case 'video': return <Video className="h-4 w-4" />;
            case 'link': return <LinkIcon className="h-4 w-4" />;
            case 'file': return <FileText className="h-4 w-4" />; // Added 'file' type
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newAttachments: ManagedEventAttachment[] = files.map(file => {
            const fileType = file.type.split('/')[0];
            const type: 'image' | 'audio' | 'video' | 'file' =
                fileType === 'image' ? 'image' :
                    fileType === 'audio' ? 'audio' :
                        fileType === 'video' ? 'video' : 'file';

            return {
                type,
                name: file.name,
                url: URL.createObjectURL(file), // Local preview URL
                file: file
            };
        });

        onChange([...attachments, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (index: number) => {
        const newAttachments = [...attachments];
        const removed = newAttachments.splice(index, 1)[0];

        // Revoke the object URL if it was a local file to prevent memory leaks
        if (removed.file && removed.url) {
            URL.revokeObjectURL(removed.url);
        }
        onChange(newAttachments);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Attachments</span>
                </div>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-black text-purple-600 uppercase hover:text-purple-700 transition-colors flex items-center gap-1.5"
                >
                    <Plus className="h-3 w-3" /> Add Files
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
            </div>

            {attachments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-purple-200 transition-all group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-purple-600 transition-colors shrink-0">
                                    {getFileIcon(file.type)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-black text-gray-900 truncate">
                                        {file.name}
                                    </span>
                                    {file.file && (
                                        <span className="text-[8px] font-bold text-purple-500 uppercase tracking-tighter">
                                            Local - Pending Upload
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeAttachment(idx)}
                                className="p-1.5 text-gray-300 hover:text-rose-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
