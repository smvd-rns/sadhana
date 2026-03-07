'use client';

import { useState } from 'react';
import { ManagedEvent, ManagedEventAttachment } from '@/types';
import { Calendar, MapPin, Users, Paperclip, MessageSquare, Check, X, Info, ExternalLink, Play, Music, Image as ImageIcon, BarChart3, Clock } from 'lucide-react';
import { submitEventResponse } from '@/lib/actions/events';
import { getThumbnailUrl } from '@/lib/utils/google-drive';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-hot-toast';

interface EventCardProps {
    event: ManagedEvent;
    isAdmin: boolean;
    onResponseUpdate: () => void;
}

export default function EventCard({ event, isAdmin, onResponseUpdate }: EventCardProps) {
    const router = useRouter();
    const { userData } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleResponse = async (status: 'coming' | 'not_coming', reason?: string) => {
        if (!userData) return;
        setIsSubmitting(true);
        try {
            await submitEventResponse({
                eventId: event.id,
                userId: userData.id,
                status,
                reason,
                isBulk: false
            });
            toast.success(status === 'coming' ? "See you there! 🙏" : "Got it, thanks for letting us know.");
            onResponseUpdate();
        } catch (error: any) {
            console.error('Error submitting response:', error);
            const message = error.message || 'Failed to submit response';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isImage = (att: ManagedEventAttachment) => {
        if (att.type === 'image') return true;
        if (att.mimeType?.startsWith('image/')) return true;
        const url = att.url?.toLowerCase() || '';
        return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.webp') || url.includes('export=view');
    };

    return (
        <div className="group relative bg-white rounded-[1.75rem] shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 overflow-hidden flex flex-col h-full hover:-translate-y-1">
            {/* Subtle Decorative Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-orange-500/10 transition-all duration-700"></div>

            <div className="p-6 flex-1 flex flex-col relative z-10">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-600 rounded-lg w-fit">
                            <Calendar className="h-3 w-3 text-white" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                {new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-orange-600 transition-colors tracking-tight uppercase">
                            {event.title}
                        </h3>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => router.push(`/dashboard/events/tracking/${event.id}`)}
                            className="p-2.5 bg-gray-50 text-gray-400 hover:bg-orange-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="Tracking Logs"
                        >
                            <BarChart3 className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Content Section */}
                <div className="space-y-4 mb-6">
                    {event.message && (
                        <div className="relative group/msg">
                            <div
                                className="text-gray-600 text-[13px] leading-relaxed font-semibold border-l-2 border-orange-200 pl-3 prose-p:my-0 prose-headings:my-1 prose-a:text-purple-600 prose-img:rounded-2xl prose-img:shadow-lg prose-img:my-4 prose-img:max-w-full"
                                dangerouslySetInnerHTML={{ __html: event.message }}
                            />
                        </div>
                    )}

                    {event.attachments.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-gray-50 mt-4">
                            {/* Image Gallery Style for Image Attachments */}
                            {event.attachments.filter(a => isImage(a)).length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {event.attachments.filter(a => isImage(a)).map((item, idx) => (
                                        <a
                                            key={`img-${idx}`}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 group/img active:scale-95 transition-all"
                                        >
                                            <NextImage
                                                src={getThumbnailUrl(item.url, 400, 300) || item.url}
                                                alt={item.name}
                                                width={400}
                                                height={300}
                                                unoptimized={true}
                                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-sm p-1.5 translate-y-full group-hover/img:translate-y-0 transition-transform">
                                                <p className="text-[8px] text-white font-bold truncate px-1">{item.name}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* List for Non-Image Attachments */}
                            <div className="flex flex-wrap gap-2">
                                {event.attachments.filter(a => !isImage(a)).map((item, idx) => (
                                    <a
                                        key={`file-${idx}`}
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100/50"
                                    >
                                        {item.type === 'video' ? <Play className="h-3 w-3" /> :
                                            item.type === 'audio' ? <Music className="h-3 w-3" /> :
                                                <Paperclip className="h-3 w-3" />}
                                        <span className="truncate max-w-[120px]">{item.name}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {event.targetAshrams.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[8px] font-black uppercase tracking-wider border border-indigo-100">
                                {a}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Interactive Status Section */}
                <div className="mt-auto pt-4 border-t border-gray-100/60">
                    {event.userResponse && (event.userResponse.status === 'coming' || event.userResponse.status === 'not_coming') ? (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${event.userResponse.status === 'coming'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-rose-50 border-rose-100 text-rose-700'
                            }`}>
                            <div className={`p-1.5 rounded-lg bg-white shadow-sm flex items-center justify-center`}>
                                {event.userResponse.status === 'coming' ? <Check className="h-4 w-4 animate-in zoom-in-50 duration-500" /> : <X className="h-4 w-4 animate-in zoom-in-50 duration-500" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                                    {event.userResponse.isBulk ? 'Assigned' : (event.userResponse.status === 'coming' ? "You're Going!" : "Declined")}
                                </p>
                                <p className="text-[8px] opacity-60 font-bold uppercase tracking-wider">
                                    {event.userResponse.isBulk ? 'Marked by Admin' : 'Response recorded'}
                                </p>
                            </div>
                        </div>
                    ) : (event.rsvpDeadline && new Date() > new Date(event.rsvpDeadline)) ? (
                        <div className="flex items-center gap-3 p-3 bg-gray-50/80 border border-gray-200 rounded-xl text-gray-400 grayscale">
                            <div className="p-1.5 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-gray-500">
                                    Time is over
                                </p>
                                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400 text-nowrap">
                                    No more responses
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleResponse('coming')}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Check className="h-3.5 w-3.5" />
                                <span>Going</span>
                            </button>
                            <button
                                onClick={() => handleResponse('not_coming')}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 py-3 bg-white text-rose-500 border border-rose-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                <span>No</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Attachment Bar */}
            {event.attachments.length > 0 && (
                <div className="px-6 py-3 bg-gray-50/50 backdrop-blur-md flex items-center justify-between border-t border-gray-100/60">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                            {event.attachments.length} Resources
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Internal icons helper
const LinkIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);
