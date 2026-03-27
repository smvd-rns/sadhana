'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { ManagedEvent, ManagedEventResponse } from '@/types';
import {
    Users, Search, Filter, Building, MapPin,
    CheckCircle, XCircle, Eye, Clock,
    CheckCircle2, X, User as UserIcon,
    Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getEventTargetedUsers, bulkSubmitResponses } from '@/lib/actions/events';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';

interface EventAudienceTrackingProps {
    event: ManagedEvent;
}

export default function EventAudienceTracking({ event }: EventAudienceTrackingProps) {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [targetedUsers, setTargetedUsers] = useState<any[]>([]);
    const [responses, setResponses] = useState<ManagedEventResponse[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'coming' | 'not_coming' | 'seen' | 'understood' | 'no_reply'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Administrative Isolation
    const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role].filter(Boolean);
    const isSuperAdmin = userRoles.some(r => ['super_admin', 8].includes(r as any));
    const isPM = userRoles.some(r => ['project_manager', 15].includes(r as any));

    // Filters (Only relevant if super admin, otherwise locked to their center)
    const [filterTemple, setFilterTemple] = useState('all');
    const [filterCenter, setFilterCenter] = useState('all');

    // Selection
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setTargetedUsers([]); // Clear previous data to prevent flashing
        setResponses([]);
        try {
            // Fetch users with geographic filters applied at server if posssible
            const users = await getEventTargetedUsers(event.id, {
                temple: isSuperAdmin ? filterTemple : undefined,
                center: isSuperAdmin ? filterCenter : undefined
            });

            // If not super admin, strictly filter to their own center in JS as well
            const finalUsers = isSuperAdmin ? users : users.filter(u => {
                const userCenter = u.center || u.current_center || u.hierarchy?.center || u.hierarchy?.currentCenter;
                const adminCenter = userData?.hierarchy?.center || userData?.currentCenter;
                return userCenter === adminCenter;
            });

            setTargetedUsers(finalUsers);

            // Fetch responses for these users
            const { getActiveSadhanaSupabase } = await import('@/lib/supabase/sadhana');
            const sadhanaSupabase = getActiveSadhanaSupabase();
            if (sadhanaSupabase) {
                const { data: respData } = await sadhanaSupabase
                    .from('event_responses')
                    .select('*')
                    .eq('event_id', event.id);

                const mapped: ManagedEventResponse[] = (respData || []).map(r => ({
                    id: r.id,
                    eventId: r.event_id,
                    userId: r.user_id,
                    status: r.status,
                    reason: r.reason,
                    isBulk: r.is_bulk,
                    bulkAddedBy: r.bulk_added_by,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at
                }));
                setResponses(mapped);
            }
        } catch (error) {
            console.error('Error fetching audience data:', error);
            toast.error('Failed to load audience list');
        } finally {
            setLoading(false);
        }
    }, [event.id, filterTemple, filterCenter, isSuperAdmin, userData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredUsers = useMemo(() => {
        return targetedUsers.filter(user => {
            const response = responses.find(r => r.userId === user.id);
            const nameMatch = user.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const emailMatch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesStatus = true;
            if (filterStatus === 'coming') matchesStatus = response?.status === 'coming';
            else if (filterStatus === 'not_coming') matchesStatus = response?.status === 'not_coming';
            else if (filterStatus === 'seen') matchesStatus = response?.status === 'seen';
            else if (filterStatus === 'understood') matchesStatus = response?.status === 'understood';
            else if (filterStatus === 'no_reply') matchesStatus = !response;

            return (nameMatch || emailMatch) && matchesStatus;
        });
    }, [targetedUsers, responses, searchTerm, filterStatus]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterTemple, filterCenter]);

    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleBulkSubmit = async (status: 'coming' | 'not_coming') => {
        if (selectedUserIds.length === 0 || !userData) return;
        setIsBulkSubmitting(true);
        try {
            await bulkSubmitResponses(event.id, selectedUserIds, userData.id, status);
            toast.success(`Confirmed ${selectedUserIds.length} users!`);
            fetchData();
            setSelectedUserIds([]);
        } catch (error) {
            toast.error('Confirmation failed');
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    if (loading && targetedUsers.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Audience Tracking...</p>
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-t border-gray-100 pt-8 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                        <Users className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">
                            {event.type === 'event' ? 'Audience Confirmation' : 'Acknowledgement Tracking'}
                        </h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {isSuperAdmin ? 'Full System View' : `Manager: ${userData?.hierarchy?.center || userData?.currentCenter || 'Restricted View'}`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-tight">
                        {event.type === 'event' 
                            ? `${responses.filter(r => r.status === 'coming').length} Confirmations`
                            : `${responses.filter(r => r.status === 'understood').length} Understood • ${responses.filter(r => r.status === 'seen').length} Seen`
                        }
                    </span>
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest leading-none">
                        Out of {targetedUsers.length} targeted
                    </span>
                </div>
            </div>

            {/* Compact Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:ring-4 focus:ring-orange-50 transition-all outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {(event.type === 'event' ? ['all', 'coming', 'no_reply'] : ['all', 'understood', 'seen', 'no_reply']).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s as any)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shrink-0 border-2 ${filterStatus === s
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                }`}
                        >
                            {s === 'no_reply' ? 'Pending' : s === 'seen' ? 'Seen' : s === 'understood' ? 'Understood' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions */}
            {event.type === 'event' && selectedUserIds.length > 0 && (
                <div className="p-3 bg-orange-600 rounded-xl text-white flex items-center justify-between gap-4 shadow-xl shadow-orange-100 animate-in zoom-in-95">
                    <div className="flex items-center gap-2 pl-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-black text-[11px] uppercase tracking-tight">{selectedUserIds.length} users selected</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkSubmit('coming')}
                            disabled={isBulkSubmitting}
                            className="px-4 py-1.5 bg-white text-orange-600 rounded-lg font-black text-[10px] uppercase tracking-widest hover:shadow-lg transition-all"
                        >
                            Confirm
                        </button>
                        <button onClick={() => setSelectedUserIds([])} className="p-1.5 hover:bg-white/10 rounded-lg">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="border border-gray-100 rounded-2xl overflow-x-auto bg-gray-50/30 custom-scrollbar-horizontal">
                <table className="w-full text-left bg-white min-w-[600px]">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 w-10">
                                {event.type === 'event' && (
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const pageIds = paginatedUsers.map(u => u.id);
                                                setSelectedUserIds(prev => Array.from(new Set([...prev, ...pageIds])));
                                            } else {
                                                const pageIds = new Set(paginatedUsers.map(u => u.id));
                                                setSelectedUserIds(prev => prev.filter(id => !pageIds.has(id)));
                                            }
                                        }}
                                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                )}
                            </th>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">User</th>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Last Sync</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedUsers.length === 0 ? (
                            <tr><td colSpan={4} className="py-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">No matching users found</td></tr>
                        ) : paginatedUsers.map(user => {
                            const response = responses.find(r => r.userId === user.id);
                            const isSelected = selectedUserIds.includes(user.id);
                            return (
                                <tr key={user.id} className={`group ${isSelected ? 'bg-orange-50/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                                    <td className="p-4">
                                        {event.type === 'event' && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    if (isSelected) setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                                    else setSelectedUserIds(prev => [...prev, user.id]);
                                                }}
                                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            />
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                                                <UserIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-gray-900 leading-none mb-0.5">{user.name}</div>
                                                <div className="text-[9px] font-bold text-gray-400 lowercase">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {response ? (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight ${response.status === 'coming' || response.status === 'understood' ? 'bg-emerald-50 text-emerald-700' :
                                                response.status === 'not_coming' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'
                                                }`}>
                                                {response.status === 'coming' && <CheckCircle className="h-3 w-3" />}
                                                {response.status === 'not_coming' && <XCircle className="h-3 w-3" />}
                                                {response.status === 'understood' && <CheckCircle2 className="h-3 w-3" />}
                                                {response.status === 'seen' && <Eye className="h-3 w-3" />}
                                                {response.status === 'understood' ? 'Understood' : response.status.replace('_', ' ')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight bg-gray-100 text-gray-300">
                                                <Clock className="h-3 w-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-[10px] font-black text-gray-900">
                                            {response ? new Date(response.updatedAt || response.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {filteredUsers.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <div>
                                Showing <span className="text-gray-900 font-black">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-gray-900 font-black">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> of <span className="text-gray-900 font-black">{filteredUsers.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Rows:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-900 font-black focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-orange-600 hover:border-orange-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-200 transition-all font-black active:scale-90"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        pageNum = currentPage - 2 + i;
                                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all active:scale-90 ${currentPage === pageNum
                                                ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                                                : 'text-gray-400 hover:text-gray-700 hover:bg-white border border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-orange-600 hover:border-orange-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-200 transition-all font-black active:scale-90"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
