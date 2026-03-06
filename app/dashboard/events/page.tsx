'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Plus, Calendar, Users, BarChart3, ChevronRight, MessageSquare, Paperclip, Check, X, Info } from 'lucide-react';
import { getEventsForUser, getEventStats, submitEventResponse, getRecentResponses } from '@/lib/actions/events';
import { ManagedEvent, ManagedEventResponse } from '@/types';
import EventCard from '@/components/events/EventCard';
import EventLogsTable from '@/components/events/EventLogsTable';
import AdminEventCompose from '@/components/events/AdminEventCompose';
import AdminEventHistory from '@/components/events/AdminEventHistory';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/config';
import EventListItem from '@/components/events/EventListItem';
import EventDetailView from '@/components/events/EventDetailView';
import { Search, Pin, Clock, ChevronLeft } from 'lucide-react';

import { toggleEventPin } from '@/lib/actions/events';



export default function EventsPage() {
    const { userData } = useAuth();
    const [events, setEvents] = useState<ManagedEvent[]>([]);
    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days'>('all');

    const unreadCount = events.filter(e => !e.userResponse).length;






    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const isAdmin = userRoles.some(role =>
        ['super_admin', 'zonal_admin', 'state_admin', 'city_admin', 'center_admin', 'bc_voice_manager', 'project_manager'].includes(String(role)) ||
        (typeof role === 'number' && role >= 4 && role <= 8) || (typeof role === 'number' && role === 15)
    );

    const fetchEvents = async () => {
        if (!userData) return;
        setLoading(true);
        try {
            const roleStr = Array.isArray(userData.role) ? String(userData.role[0]) : String(userData.role);
            const completedCamps = [
                userData.campDys && 'campDys',
                userData.campSankalpa && 'campSankalpa',
                userData.campSphurti && 'campSphurti',
                userData.campUtkarsh && 'campUtkarsh',
                userData.campFaithAndDoubt && 'campFaithAndDoubt',
                userData.campSrcgdWorkshop && 'campSrcgdWorkshop',
                userData.campNistha && 'campNistha',
                userData.campAshray && 'campAshray'
            ].filter(Boolean) as string[];

            const userParams = {
                userId: userData.id,
                ashram: userData.hierarchy?.ashram,
                role: roleStr,
                temple: userData.hierarchy?.temple,
                center: userData.hierarchy?.center,
                completedCamps
            };

            const data = await getEventsForUser(isAdmin ? { userId: userData.id } : userParams);

            // Sorting logic: Personal Pinned > Important > Date
            const sortedData = [...data].sort((a, b) => {
                // 1. Pins
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;

                // 2. Important
                if (a.isImportant && !b.isImportant) return -1;
                if (!a.isImportant && b.isImportant) return 1;

                // 3. Date
                return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
            });

            setEvents(sortedData);



            if (isAdmin) fetchLogs();
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const logs = await getRecentResponses(30);

            // Map user names from main Supabase
            const userIds = Array.from(new Set(logs.map(l => l.userId)));
            if (userIds.length > 0) {
                const { data: users } = await supabase!
                    .from('users')
                    .select('id, name, email')
                    .in('id', userIds);

                const userMap = new Map(users?.map(u => [u.id, u]) || []);
                const detailedLogs = logs.map(log => ({
                    ...log,
                    userName: userMap.get(log.userId)?.name,
                    userEmail: userMap.get(log.userId)?.email
                }));
                setGlobalLogs(detailedLogs);
            } else {
                setGlobalLogs([]);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [userData, isAdmin]);

    // Handle marking events as 'seen' only when selected
    useEffect(() => {
        const markSelectedAsSeen = async () => {
            if (!userData || !selectedEventId) return;

            const selectedEventObj = events.find(e => e.id === selectedEventId);
            if (!selectedEventObj || selectedEventObj.userResponse) return; // Already has a response or seen

            try {
                // Update local state IMMEDIATELY for instant UI feedback
                setEvents(prev => prev.map(e =>
                    e.id === selectedEventId
                        ? {
                            ...e,
                            userResponse: {
                                id: 'temp-' + Date.now(),
                                eventId: e.id,
                                userId: userData.id,
                                status: 'seen' as const,
                                isBulk: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        }
                        : e
                ));

                const { getActiveSadhanaSupabase } = await import('@/lib/supabase/sadhana');
                const supabase = getActiveSadhanaSupabase();
                if (!supabase) return;

                console.log('Marking event as seen on selection:', selectedEventId);
                await submitEventResponse({
                    eventId: selectedEventId,
                    userId: userData.id,
                    status: 'seen',
                    isBulk: false
                });
            } catch (error) {
                console.error('Error marking event as seen:', error);
                // Optional: rollback state on error, but usually not needed for 'seen'
            }
        };

        markSelectedAsSeen();
    }, [selectedEventId, userData, events]);

    const handlePinToggle = async (eventId: string, pinned: boolean) => {
        if (!userData) return;

        // Optimistic update: Update state IMMEDIATELY
        const previousEvents = [...events];
        setEvents(prev => {
            const updated = prev.map(e => e.id === eventId ? { ...e, isPinned: pinned } : e);
            return [...updated].sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                if (a.isImportant && !b.isImportant) return -1;
                if (!a.isImportant && b.isImportant) return 1;
                return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
            });
        });

        try {
            await toggleEventPin(eventId, userData.id, pinned);
            toast.success(pinned ? "Announcement Pinned" : "Unpinned");
        } catch (error) {
            console.error('Error toggling pin:', error);
            setEvents(previousEvents); // Rollback on failure
            toast.error('Failed to update pin');
        }
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.message && event.message.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        const eventDate = new Date(event.eventDate);
        const now = new Date();
        if (dateFilter === '7days') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            return eventDate >= sevenDaysAgo;
        }
        if (dateFilter === '30days') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            return eventDate >= thirtyDaysAgo;
        }
        return true;
    });



    const [showHistory, setShowHistory] = useState(true);
    const [showComposer, setShowComposer] = useState(false);
    const [activeView, setActiveView] = useState<'audience' | 'management'>('audience');

    const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

    useEffect(() => {
        if (events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    const handleEventSelect = (id: string) => {
        setSelectedEventId(id);
        setIsMobileDetailOpen(true);
    };


    return (
        <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Admin Tab Switcher */}
            {isAdmin && (
                <div className="flex justify-center md:justify-start px-4 sm:px-6">
                    <div className="bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl flex gap-1 border border-gray-200 shadow-inner w-full md:w-auto">
                        <button
                            onClick={() => setActiveView('audience')}
                            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeView === 'audience'
                                ? 'bg-white text-orange-600 shadow-lg shadow-orange-100 ring-1 ring-orange-500/10'
                                : 'text-gray-400 hover:text-gray-600 active:scale-95'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Users className={`h-3.5 w-3.5 ${activeView === 'audience' ? 'animate-bounce' : ''}`} />
                                Audience View
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveView('management')}
                            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeView === 'management'
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                : 'text-gray-400 hover:text-gray-600 active:scale-95'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <BarChart3 className={`h-3.5 w-3.5 ${activeView === 'management' ? 'animate-pulse' : ''}`} />
                                Management Hub
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Dynamic Content Rendering */}
            {(isAdmin && activeView === 'management') ? (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-10">
                    {/* Compose Section */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3 px-2 sm:px-6">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-orange-600 rounded-lg shadow-md shadow-orange-100">
                                    <Plus className={`h-4 w-4 text-white transition-transform duration-500 ${showComposer ? 'rotate-45' : 'rotate-0'}`} />
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-gray-900">New Announcement</h2>
                            </div>
                            <button
                                onClick={() => setShowComposer(!showComposer)}
                                className={`px-4 sm:px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border ${showComposer
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                    : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {showComposer ? 'Close Composer' : 'Create New'}
                            </button>
                        </div>

                        {showComposer && (
                            <div className="animate-in slide-in-from-top-4 duration-500">
                                <AdminEventCompose onSuccess={() => {
                                    fetchEvents();
                                    setShowComposer(false);
                                }} />
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3 px-2 sm:px-6">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-purple-600 rounded-lg shadow-md shadow-purple-100">
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight text-gray-900">Announcement History</h2>
                            </div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="px-4 sm:px-6 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                            >
                                {showHistory ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {showHistory && (
                            <AdminEventHistory
                                events={events}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col animate-in slide-in-from-left-4 duration-500">
                    {/* Premium Header for Audience View - Simplified and hideable */}
                    <div className={`px-4 sm:px-6 mb-6 ${isMobileDetailOpen ? 'hidden md:block' : 'block'}`}>
                        <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-50/10 rounded-full -mr-48 -mt-48 blur-[80px] transition-all duration-1000"></div>
                            <div className="relative z-10 space-y-1">
                                <div className="flex items-center gap-2 mb-1 px-3 py-0.5 bg-orange-600 rounded-lg w-fit shadow-md shadow-orange-100">
                                    <Calendar className="h-3.5 w-3.5 text-white" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Community Hub</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-gray-900">
                                    Events & <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Gatherings</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Split Pane Interface */}
                    <div className="flex bg-white rounded-[2rem] shadow-2xl border border-gray-100 mx-4 sm:mx-6 mb-6 min-h-0 items-start">
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                <p className="text-gray-400 font-bold">Retrieving events...</p>
                            </div>
                        ) : events.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                                <div className="mx-auto w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                                    <Calendar className="h-12 w-12 text-orange-200" />
                                </div>
                                <h3 className="text-lg font-black text-gray-800">No new events</h3>
                                <p className="text-gray-400 mt-2 font-medium text-xs">Check back soon for upcoming programs.</p>
                            </div>
                        ) : (
                            <>
                                {/* Sidebar: sticky items */}
                                <div className={`w-full md:w-[280px] lg:w-[320px] flex flex-col border-r border-gray-100 sticky top-4 self-start max-h-[calc(100vh-2rem)] ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-none">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-[10px]">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Inbox ({events.length})
                                            </div>
                                            {unreadCount > 0 && (
                                                <div className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[9px] font-black animate-pulse shadow-lg shadow-blue-200">
                                                    {unreadCount} UNREAD
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Filters: Search & Date */}
                                    <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-3">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search Announcements..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-900/10 focus:border-gray-900 rounded-2xl text-[12px] font-bold text-gray-900 placeholder:text-gray-400 transition-all outline-none focus:ring-4 focus:ring-gray-900/5"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {[
                                                { id: 'all', label: 'All' },
                                                { id: '7days', label: 'Recent' },
                                                { id: '30days', label: 'Month' }
                                            ].map((btn) => (
                                                <button
                                                    key={btn.id}
                                                    onClick={() => setDateFilter(btn.id as any)}
                                                    className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${dateFilter === btn.id
                                                        ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                        }`}
                                                >
                                                    {btn.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {filteredEvents.length > 0 ? (
                                            filteredEvents.map(event => (
                                                <EventListItem
                                                    key={event.id}
                                                    event={event}
                                                    isActive={selectedEventId === event.id}
                                                    onClick={() => {
                                                        setSelectedEventId(event.id);
                                                        setIsMobileDetailOpen(true);
                                                    }}
                                                    onPinToggle={(pinned) => handlePinToggle(event.id, pinned)}
                                                />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                                <div className="p-6 bg-gray-50 rounded-3xl mb-4">
                                                    <Search className="h-8 w-8 text-gray-200" />
                                                </div>
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No matching announcements</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Area: full detail */}
                                <div className={`flex-1 flex flex-col min-w-0 bg-white ${!isMobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
                                    {/* Mobile Back Button */}
                                    <div className="md:hidden p-4 border-b border-gray-100 bg-white sticky top-0 z-20 flex items-center gap-4">
                                        <button
                                            onClick={() => setIsMobileDetailOpen(false)}
                                            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                        >
                                            <ChevronLeft className="h-5 w-5 text-gray-400" />
                                        </button>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Back to Announcements</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {selectedEvent ? (
                                            <EventDetailView
                                                event={selectedEvent}
                                                onResponseUpdate={fetchEvents}
                                            />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-300">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <MessageSquare className="h-10 w-10" />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-widest">Select an announcement to view details</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
