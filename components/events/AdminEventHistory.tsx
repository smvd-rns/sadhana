import { useState, useMemo } from 'react';
import { ManagedEvent } from '@/types';
import { format } from 'date-fns';
import { Mail, Users, CheckCircle, Clock, ChevronDown, Search, ArrowUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminEventHistoryProps {
    events: ManagedEvent[];
}

type SortKey = 'createdAt' | 'title' | 'reachedCount' | 'comingCount';

export default function AdminEventHistory({ events }: AdminEventHistoryProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'createdAt',
        direction: 'desc'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // 1. Filtering Logic
    const filteredEvents = useMemo(() => {
        return events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.createdByName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [events, searchTerm]);

    // 2. Sorting Logic
    const sortedEvents = useMemo(() => {
        const items = [...filteredEvents];
        items.sort((a, b) => {
            const aValue = a[sortConfig.key] ?? 0;
            const bValue = b[sortConfig.key] ?? 0;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [filteredEvents, sortConfig]);

    // 3. Pagination Logic
    const paginatedEvents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedEvents.slice(start, start + pageSize);
    }, [sortedEvents, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedEvents.length / pageSize);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
        setCurrentPage(1); // Reset to first page on sort
    };

    const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
        return (
            <div className="flex flex-col -space-y-1">
                <ChevronDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180 text-purple-600' : 'text-gray-300'}`} />
                <ChevronDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'desc' ? 'text-purple-600' : 'text-gray-300'}`} />
            </div>
        );
    };

    return (
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-gray-200/50 border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Toolbar: Search & Summary */}
            <div className="px-4 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/10 gap-4">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Clock className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-gray-900 tracking-tight leading-none mb-1">Announcement History</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                            {sortedEvents.length} {sortedEvents.length === 1 ? 'broadcast' : 'broadcasts'} found
                            {searchTerm && <span className="text-purple-600 ml-1">• matching &quot;{searchTerm}&quot;</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 focus:border-purple-600 focus:ring-4 focus:ring-purple-50 rounded-xl text-[11px] font-bold text-gray-700 transition-all placeholder:text-gray-300 placeholder:italic"
                        />
                    </div>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 focus:ring-4 focus:ring-purple-50 transition-all cursor-pointer outline-none"
                    >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/30 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-gray-100 group transition-colors"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center gap-2">
                                    Date & Time
                                    <SortIndicator columnKey="createdAt" />
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:bg-gray-100 group transition-colors"
                                onClick={() => handleSort('title')}
                            >
                                <div className="flex items-center gap-2">
                                    Subject
                                    <SortIndicator columnKey="title" />
                                </div>
                            </th>
                            <th className="px-6 py-4 hidden md:table-cell">Author</th>
                            <th
                                className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 group transition-colors"
                                onClick={() => handleSort('reachedCount')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    Audience
                                    <SortIndicator columnKey="reachedCount" />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedEvents.map((event) => (
                            <tr
                                key={event.id}
                                onClick={() => router.push(`/dashboard/events/tracking/${event.id}`)}
                                className="group hover:bg-purple-50/30 transition-all cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-50 text-gray-400 rounded-md group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                                            <Clock className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-gray-900 leading-none mb-1">{format(new Date(event.createdAt), 'MMM d, yyyy')}</div>
                                            <div className="text-[9px] font-bold text-gray-400 leading-none">{format(new Date(event.createdAt), 'hh:mm a')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 max-w-md">
                                        <span className="text-xs font-black text-gray-700 group-hover:text-purple-700 transition-colors uppercase tracking-tight line-clamp-1">{event.title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black group-hover:bg-purple-600 transition-colors">
                                            {(event.createdByName || event.title).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-gray-900 leading-none mb-0.5">{event.createdByName || 'Admin'}</div>
                                            <div className="text-[9px] font-bold text-gray-400 lowercase leading-none">broadcast</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black border border-blue-100/50">
                                        <Users className="h-3 w-3" />
                                        <span className="text-blue-900 font-black">{event.comingCount || 0}</span>
                                        <span className="text-blue-300 mx-0.5">/</span>
                                        <span className="font-bold opacity-70">{event.reachedCount || 0}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black border border-emerald-100">
                                        <CheckCircle className="h-3 w-3" />
                                        Sent
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {sortedEvents.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Showing <span className="text-gray-900 font-black">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-gray-900 font-black">{Math.min(currentPage * pageSize, sortedEvents.length)}</span> of <span className="text-gray-900 font-black">{sortedEvents.length}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-purple-600 hover:border-purple-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-100 transition-all font-black active:scale-90"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple pagination windows logic
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
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
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
                            className="p-1.5 rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-purple-600 hover:border-purple-200 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-gray-100 transition-all font-black active:scale-90"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {sortedEvents.length === 0 && (
                <div className="p-24 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 relative group">
                        <Search className="h-8 w-8 text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-purple-500/5 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                    </div>
                    <p className="text-gray-900 font-black text-lg tracking-tight mb-2">No results found</p>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                        Try adjusting your search terms or filters
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-6 text-[10px] font-black text-purple-600 uppercase tracking-widest hover:text-purple-700 underline underline-offset-4 active:scale-95 transition-all"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
