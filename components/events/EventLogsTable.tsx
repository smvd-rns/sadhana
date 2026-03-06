'use client';

import { ManagedEventResponse } from '@/types';
import { Eye, Check, X, Clock, MessageSquare, User } from 'lucide-react';

interface EventLogsTableProps {
    responses: (ManagedEventResponse & { eventTitle?: string, userName?: string, userEmail?: string })[];
    loading?: boolean;
    showEventTitle?: boolean;
}

export default function EventLogsTable({ responses, loading, showEventTitle = true }: EventLogsTableProps) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'coming': return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-50';
            case 'not_coming': return 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-50';
            case 'seen': return 'bg-sky-50 text-sky-700 border-sky-100 shadow-sm shadow-sky-50';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'coming': return <Check className="h-3 w-3" />;
            case 'not_coming': return <X className="h-3 w-3" />;
            case 'seen': return <Eye className="h-3 w-3" />;
            default: return <Clock className="h-3 w-3" />;
        }
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-orange-100 text-orange-600 shadow-orange-100',
            'bg-blue-100 text-blue-600 shadow-blue-100',
            'bg-emerald-100 text-emerald-600 shadow-emerald-100',
            'bg-rose-100 text-rose-600 shadow-rose-100',
            'bg-indigo-100 text-indigo-600 shadow-indigo-100'
        ];
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-50 rounded-[1.5rem] border border-gray-100"></div>
                ))}
            </div>
        );
    }

    if (responses.length === 0) {
        return (
            <div className="p-16 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                    <Clock className="h-10 w-10 text-gray-300" />
                </div>
                <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest">No Recent Activity</h4>
                <p className="text-gray-400 text-xs font-bold mt-1">Waiting for the community to engage...</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/40 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 backdrop-blur-md border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Initiator</th>
                            {showEventTitle && <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Event</th>}
                            <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement</th>
                            <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Timeline</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {responses.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/80 transition-all group cursor-default">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-11 w-11 ${getAvatarColor(log.userName || 'U')} rounded-[1.25rem] flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                            {(log.userName || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
                                                {log.userName || 'Anonymous User'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold tracking-tight uppercase opacity-60">
                                                {log.userEmail || `#${log.userId.substring(0, 8)}`}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                {showEventTitle && (
                                    <td className="px-6 py-6">
                                        <div className="text-xs font-black text-gray-700 line-clamp-1 group-hover:text-gray-900 transition-colors">
                                            {log.eventTitle}
                                        </div>
                                    </td>
                                )}
                                <td className="px-6 py-6">
                                    <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[9px] font-black uppercase border transition-all duration-300 group-hover:scale-105 ${getStatusStyles(log.status)}`}>
                                        {getStatusIcon(log.status)}
                                        {log.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-6">
                                    {log.reason ? (
                                        <div className="flex items-start gap-3 max-w-xs transform group-hover:translate-x-1 transition-all duration-500">
                                            <div className="mt-1 p-1 bg-rose-50 rounded-lg">
                                                <MessageSquare className="h-3 w-3 text-rose-500 shrink-0" />
                                            </div>
                                            <span className="text-[11px] text-gray-600 font-semibold italic leading-relaxed">
                                                &quot;{log.reason}&quot;
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300 text-[10px] font-black uppercase tracking-widest pl-7 italic opacity-40">Silent Reach</span>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs font-black text-gray-900">
                                            {new Date(log.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </div>
                                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">
                                            {new Date(log.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
