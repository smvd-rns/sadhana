'use client';

import React from 'react';
import { Search, Filter, LayoutGrid, Users, Building2, TreePine, UserCheck } from 'lucide-react';

interface FilterPanelProps {
    groupBy: string;
    onGroupByChange: (value: string) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedCamp: string;
    onCampChange: (value: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    groupBy,
    onGroupByChange,
    searchTerm,
    onSearchChange,
    selectedCamp,
    onCampChange
}) => {
    const filters = [
        { id: 'temple', label: 'By Temple/Center', icon: Building2, color: 'from-amber-500 to-orange-600' },
        { id: 'counselor', label: 'By Counselor', icon: UserCheck, color: 'from-blue-500 to-indigo-600' },
        { id: 'camp', label: 'By Camps', icon: LayoutGrid, color: 'from-purple-500 to-violet-600' },
        { id: 'role', label: 'By Role Hierarchy', icon: Users, color: 'from-emerald-500 to-teal-600' },
        { id: 'ashram', label: 'By Ashram', icon: TreePine, color: 'from-rose-500 to-pink-600' },
    ];

    const CAMP_OPTIONS = [
        { label: 'DYS', value: 'camp_dys' },
        { label: 'Sankalpa', value: 'camp_sankalpa' },
        { label: 'Sphurti', value: 'camp_sphurti' },
        { label: 'Utkarsh', value: 'camp_utkarsh' },
        { label: 'Faith & Doubt', value: 'camp_faith_and_doubt' },
        { label: 'SRCGD Workshop', value: 'camp_srcgd_workshop' },
        { label: 'Nistha', value: 'camp_nistha' },
        { label: 'Ashray', value: 'camp_ashray' },
    ];

    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 flex flex-col gap-6 sticky top-4 z-40">
            {/* Search Bar - Top & Full Width */}
            <div className="flex gap-4">
                <div className="relative w-full group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-amber-500 group-focus-within:scale-110 transition-all duration-300" />
                    <input
                        type="text"
                        placeholder="Search across all temples, centers, counselors, and members..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-5 py-3.5 bg-gray-50/50 border border-gray-100/50 rounded-2xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-500/50 shadow-inner transition-all duration-300 placeholder:text-gray-400"
                    />
                </div>

                {/* Camp Filter Dropdown */}
                <div className="relative min-w-[200px]">
                    <select
                        value={selectedCamp}
                        onChange={(e) => onCampChange(e.target.value)}
                        className="w-full h-full pl-4 pr-10 py-3.5 bg-gray-50/50 border border-gray-100/50 rounded-2xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-500/50 shadow-inner transition-all duration-300 text-gray-600 appearance-none cursor-pointer"
                    >
                        <option value="">All Camps</option>
                        {CAMP_OPTIONS.map(camp => (
                            <option key={camp.value} value={camp.value}>
                                {camp.label}
                            </option>
                        ))}
                    </select>
                    <Filter className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Filter Buttons - Below & Full Width Row */}
            <div className="flex flex-wrap gap-3 w-full">
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => onGroupByChange(f.id)}
                        className={`group relative flex items-center px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex-1 justify-center min-w-[140px] ${groupBy === f.id
                            ? `bg-gradient-to-br ${f.color} text-white shadow-lg scale-105`
                            : 'bg-gray-50/50 text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 border-transparent'
                            } border border-white/20`}
                    >
                        <f.icon className={`w-4 h-4 mr-2.5 transition-transform duration-300 ${groupBy === f.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                        {f.label}
                        {groupBy === f.id && (
                            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
