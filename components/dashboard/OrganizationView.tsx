'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { roleHierarchy } from '@/lib/utils/roles';
import { StatsCard } from '@/components/president/StatsCard';
import { FilterPanel } from '@/components/president/FilterPanel';
import { OrganizationTree } from '@/components/president/OrganizationTree';
import { supabase } from '@/lib/supabase/config';
import {
    Users,
    Building2,
    UserCheck,
    Activity,
    Loader2,
    ShieldAlert,
    BarChart
} from 'lucide-react';

export default function OrganizationView() {
    const { userData, loading: authLoading } = useAuth();
    const [statsLoading, setStatsLoading] = useState(true);
    const [hierarchyLoading, setHierarchyLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [hierarchy, setHierarchy] = useState<any>(null);
    const [groupBy, setGroupBy] = useState('temple');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCamp, setSelectedCamp] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            if (!token) return;

            const res = await fetch('/api/president/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    const fetchHierarchy = useCallback(async () => {
        try {
            setHierarchyLoading(true);
            const { data: { session } } = await supabase!.auth.getSession();
            const token = session?.access_token;

            if (!token) return;

            const res = await fetch(`/api/president/hierarchy?groupBy=${groupBy}&search=${searchTerm}&camp=${selectedCamp}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setHierarchy(data);
            }
        } catch (error) {
            console.error('Error loading hierarchy:', error);
        } finally {
            setHierarchyLoading(false);
        }
    }, [groupBy, searchTerm, selectedCamp]);

    useEffect(() => {
        if (!authLoading && userData) {
            fetchStats();
            fetchHierarchy();
        }
    }, [authLoading, userData, fetchStats, fetchHierarchy]);

    useEffect(() => {
        if (!authLoading && userData) {
            fetchHierarchy();
        }
    }, [authLoading, userData, groupBy, searchTerm, selectedCamp, fetchHierarchy]);

    if (authLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
    );

    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const maxRole = Math.max(...userRoles.map((r: any) => roleHierarchy.get(r)));

    // Roles 8 (Super Admin), 9 (VP), 10 (President) allowed
    if (maxRole < 8) {
        return (
            <div className="max-w-7xl mx-auto py-12 px-4 text-center">
                <div className="bg-red-50 p-8 rounded-3xl inline-block mb-6">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
                <p className="text-gray-500 mt-2">You do not have permission to view the Organization Intelligence Dashboard.</p>
            </div>
        );
    }

    const isReadOnly = maxRole === 9 || maxRole === 10;

    // Defensive data for stats to prevent crashes
    const displayStats = stats || {
        totalUsers: 0,
        byRole: {},
        byTemple: {},
        byCenter: {},
        byAshram: {}
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-50/50 via-slate-50 to-white -m-8 p-8 animate-in fade-in duration-700">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header - Vibrant Multi-Color Version */}
                <div className="relative group overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-orange-200/50 transition-all duration-700">
                    {/* Decorative high-energy elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full blur-xl" />
                    </div>

                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl ring-4 ring-white/30 shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <BarChart className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none">
                                    Organization <span className="underline decoration-white/30 underline-offset-8">View</span>
                                </h1>
                                <p className="text-white/80 font-bold mt-3 text-lg uppercase tracking-widest flex items-center gap-3">
                                    <Activity className="w-5 h-5 animate-pulse" />
                                    Real-Time Hierarchy Intelligence
                                    {isReadOnly && <span className="ml-4 px-4 py-1.5 bg-black/20 backdrop-blur-md rounded-full text-[10px] text-white border border-white/20 font-black">READ-ONLY ANALYTICS</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatsCard
                        title="Total Population"
                        value={displayStats.totalUsers}
                        description="Total registered users in system"
                        icon={Users}
                        color="text-indigo-600"
                        bgColor="bg-blue-50"
                        trend={{ value: '12%', positive: true }}
                    />
                    <StatsCard
                        title="Temples"
                        value={Object.keys(displayStats.byTemple || {}).length}
                        description="Active temple locations"
                        icon={Building2}
                        color="text-emerald-600"
                        bgColor="bg-emerald-50"
                    />
                    <StatsCard
                        title="Centers"
                        value={Object.keys(displayStats.byCenter || {}).length}
                        description="Centers across all locations"
                        icon={Activity}
                        color="text-rose-600"
                        bgColor="bg-rose-50"
                    />
                    <StatsCard
                        title="Administrators"
                        value={(displayStats.byRole?.['8'] || 0) + (displayStats.byRole?.['super_admin'] || 0)}
                        description="Super admins managing system"
                        icon={UserCheck}
                        color="text-purple-600"
                        bgColor="bg-purple-50"
                    />
                </div>

                {/* Filter Panel (Now only for Grouping) */}
                <FilterPanel
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    selectedCamp={selectedCamp}
                    onCampChange={setSelectedCamp}
                />

                {/* Dynamic Organization Trees */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                    {hierarchyLoading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="h-[400px] bg-white/50 backdrop-blur-sm rounded-[2.5rem] animate-pulse border border-gray-100 flex flex-col p-8 space-y-4">
                                <div className="h-20 bg-gray-100 rounded-2xl w-full" />
                                <div className="flex-1 space-y-4 pt-4">
                                    <div className="h-8 bg-gray-50 rounded-xl w-3/4" />
                                    <div className="h-8 bg-gray-50 rounded-xl w-1/2" />
                                    <div className="h-8 bg-gray-50 rounded-xl w-2/3" />
                                </div>
                            </div>
                        ))
                    ) : (
                        hierarchy?.children?.map((branch: any, index: number) => {
                            const gradientPool = [
                                'from-indigo-600 via-blue-600 to-blue-700',
                                'from-emerald-500 via-teal-500 to-cyan-600',
                                'from-rose-500 via-pink-500 to-rose-600',
                                'from-violet-600 via-purple-600 to-fuchsia-700',
                                'from-amber-400 via-orange-500 to-orange-600',
                                'from-sky-500 via-blue-500 to-indigo-600',
                                'from-teal-500 via-emerald-600 to-green-700',
                                'from-fuchsia-500 via-pink-600 to-rose-700'
                            ];

                            return (
                                <div key={branch.id} className="h-full">
                                    <OrganizationTree
                                        data={branch}
                                        title={branch.label}
                                        customGradient={gradientPool[index % gradientPool.length]}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
                {!hierarchyLoading && hierarchy?.children?.length === 0 && (
                    <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
                        <BarChart className="w-12 h-12 text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium">No organizational data found for current filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
