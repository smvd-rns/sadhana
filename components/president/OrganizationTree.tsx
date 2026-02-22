'use client';

import React, { useState, useMemo } from 'react';
import {
    ChevronRight,
    ChevronDown,
    User,
    Building2,
    MapPin,
    Shield,
    TreePine,
    Mail,
    ShieldCheck,
    Search,
    Maximize2,
    Minimize2
} from 'lucide-react';

interface TreeNodeProps {
    node: any;
    level: number;
    forceExpand?: { state: boolean; timestamp: number };
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, forceExpand }) => {
    // Initialize state from forceExpand if available, otherwise default to collapsed
    const [isInternalExpanded, setIsInternalExpanded] = useState(() => {
        if (forceExpand !== undefined) return forceExpand.state;
        return false; // Default to collapsed for a cleaner initial view
    });

    // Sync with global expand/collapse trigger
    React.useEffect(() => {
        if (forceExpand !== undefined) {
            setIsInternalExpanded(forceExpand.state);
        }
    }, [forceExpand]);

    const hasChildren = node.children && node.children.length > 0;
    const isUser = node.type === 'user';

    const getIcon = () => {
        switch (node.type) {
            case 'temple': return Building2;
            case 'center': return MapPin;
            case 'role': return Shield;
            case 'ashram': return TreePine;
            case 'user': return User;
            default: return ChevronRight;
        }
    };

    const nodeColors: Record<string, string> = {
        temple: 'text-amber-600 bg-amber-50',
        center: 'text-blue-600 bg-blue-50',
        role: 'text-purple-600 bg-purple-50',
        ashram: 'text-green-600 bg-green-50',
        user: 'text-gray-600 bg-gray-50',
    };

    const Icon = getIcon();

    return (
        <div className="select-none">
            <div
                className={`flex items-center group py-2 px-3 rounded-xl transition-all ${isUser ? 'hover:bg-gray-50' : 'hover:bg-amber-50 cursor-pointer'
                    }`}
                onClick={(e) => {
                    if (!isUser && hasChildren) {
                        e.stopPropagation();
                        setIsInternalExpanded(!isInternalExpanded);
                    }
                }}
            >
                <div className="flex items-center flex-1">
                    {/* Level padding */}
                    <div style={{ width: `${level * 24}px` }} className="shrink-0" />

                    {/* Expand/Collapse Icon */}
                    {!isUser && hasChildren ? (
                        <div className="w-6 h-6 flex items-center justify-center mr-1 text-gray-400 group-hover:text-amber-500 transition-colors">
                            {isInternalExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                    ) : (
                        <div className="w-6 h-6 mr-1" />
                    )}

                    {/* Node Icon */}
                    <div className={`p-1.5 rounded-lg mr-3 ${nodeColors[node.type] || 'bg-gray-100'}`}>
                        <Icon className="w-4 h-4" />
                    </div>

                    {/* Label */}
                    <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-semibold truncate ${isUser ? 'text-gray-700' : 'text-gray-900'}`}>
                            {node.label}
                        </span>
                        {isUser && node.email && (
                            <span className="text-xs text-gray-400 font-normal truncate">{node.email}</span>
                        )}
                        {!isUser && node.count !== undefined && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                {node.count} {node.count === 1 ? 'user' : 'users'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick Info/Badges for users */}
                {isUser && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-white rounded-lg transition-all shadow-sm">
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Render children */}
            {isInternalExpanded && hasChildren && (
                <div className="mt-1">
                    {node.children.map((child: any) => (
                        <TreeNode key={child.id} node={child} level={level + 1} forceExpand={forceExpand} />
                    ))}
                </div>
            )}
        </div>
    );
};

export const OrganizationTree: React.FC<{ data: any; title: string; customGradient?: string }> = ({ data, title, customGradient }) => {
    const [localSearch, setLocalSearch] = useState('');
    const [forceExpand, setForceExpand] = useState<{ state: boolean; timestamp: number } | undefined>(undefined);
    const [isFlatExpanded, setIsFlatExpanded] = useState(false); // Default collapsed for flat lists

    // Detect if this is a flat hierarchy (direct children are users)
    const isFlatHierarchy = useMemo(() => {
        if (!data?.children) return false;
        return !data.children.some((child: any) => child.type !== 'user');
    }, [data]);

    // Map title/type to specific gradients for variety
    const getBranchGradient = () => {
        if (customGradient) return customGradient;

        const t = title.toLowerCase();
        if (t.includes('temple')) return 'from-indigo-600 via-blue-600 to-blue-700';
        if (t.includes('center')) return 'from-sky-500 via-blue-500 to-indigo-600';
        if (t.includes('role') || t.includes('admin') || t.includes('president')) return 'from-violet-600 via-purple-600 to-fuchsia-700';
        if (t.includes('ashram')) return 'from-emerald-500 via-teal-500 to-cyan-600';
        if (t.includes('counselor')) return 'from-rose-500 via-pink-500 to-rose-600';
        if (t.includes('camp')) return 'from-amber-400 via-orange-500 to-orange-600';
        return 'from-slate-700 via-gray-800 to-slate-900'; // Fallback
    };

    const gradient = getBranchGradient();

    // Recursive search logic
    const filteredData = useMemo(() => {
        if (!localSearch) return data;

        const filterNode = (node: any): any => {
            const matchesSearch = node.label.toLowerCase().includes(localSearch.toLowerCase()) ||
                (node.email && node.email.toLowerCase().includes(localSearch.toLowerCase()));

            if (node.children) {
                const filteredChildren = node.children
                    .map((child: any) => filterNode(child))
                    .filter((child: any) => child !== null);

                if (filteredChildren.length > 0 || matchesSearch) {
                    return { ...node, children: filteredChildren, count: filteredChildren.length };
                }
            } else if (matchesSearch) {
                return node;
            }

            return null;
        };

        const result = {
            ...data,
            children: data.children
                .map((child: any) => filterNode(child))
                .filter((child: any) => child !== null)
        };

        return result;
    }, [data, localSearch]);

    // Handle Expand/Collapse Logic based on hierarchy type
    const handleExpandAll = () => {
        if (isFlatHierarchy) {
            setIsFlatExpanded(true);
        } else {
            setForceExpand({ state: true, timestamp: Date.now() });
        }
    };

    const handleCollapseAll = () => {
        if (isFlatHierarchy) {
            setIsFlatExpanded(false);
        } else {
            setForceExpand({ state: false, timestamp: Date.now() });
        }
    };

    if (!data || !data.children) return (
        <div className="bg-white/50 backdrop-blur-sm p-12 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center text-center">
            <TreePine className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">No data available for this section</p>
        </div>
    );

    const totalUsers = filteredData.children?.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 0;

    return (
        <div className="group bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 overflow-hidden flex flex-col h-full hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            {/* Branch Header */}
            <div className={`p-5 bg-gradient-to-br ${gradient} text-white space-y-4 shadow-lg relative overflow-hidden`}>
                {/* Decorative background circle */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-white tracking-tight truncate max-w-[180px] leading-tight">
                                {title}
                            </h3>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                                {totalUsers} Organizational Units
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-black/10 backdrop-blur-sm p-1 rounded-xl border border-white/10">
                        <button
                            onClick={handleExpandAll}
                            className={`p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all ${isFlatHierarchy && isFlatExpanded ? 'bg-white/20 text-white' : ''}`}
                            title="Expand All"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCollapseAll}
                            className={`p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all ${isFlatHierarchy && !isFlatExpanded ? 'bg-white/20 text-white' : ''}`}
                            title="Collapse All"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Local Search - Only show if content is expanded or not flat */}
                {(isFlatExpanded || !isFlatHierarchy) && (
                    <div className="relative group animate-in fade-in slide-in-from-top-2">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-white transition-colors" />
                        <input
                            type="text"
                            placeholder={`Locate within ${title}...`}
                            value={localSearch}
                            onChange={(e) => {
                                setLocalSearch(e.target.value);
                                if (e.target.value) {
                                    if (isFlatHierarchy) setIsFlatExpanded(true);
                                    else setForceExpand({ state: true, timestamp: Date.now() });
                                }
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all font-medium"
                        />
                    </div>
                )}
            </div>

            {/* Tree Content - Toggle visibility for flat hierarchies */}
            {(!isFlatHierarchy || isFlatExpanded) && (
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 max-h-[550px] bg-white animate-in slide-in-from-top-4 duration-300">
                    {filteredData.children.length > 0 ? (
                        <div className="space-y-1">
                            {filteredData.children.map((child: any) => (
                                <TreeNode
                                    key={child.id}
                                    node={child}
                                    level={0}
                                    forceExpand={forceExpand}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-gray-200" />
                            </div>
                            <p className="text-gray-400 text-sm font-medium">No matches found in this branch</p>
                            <button
                                onClick={() => setLocalSearch('')}
                                className="text-amber-600 text-xs font-bold mt-3 hover:underline flex items-center justify-center mx-auto"
                            >
                                Reset Search
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Show summarized state for collapsed flat hierarchies */}
            {isFlatHierarchy && !isFlatExpanded && (
                <div className="p-8 flex-1 flex flex-col items-center justify-center text-center bg-gray-50/50 animate-in fade-in">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} bg-opacity-10 mb-3`}>
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">
                        {filteredData.children.length} Members
                    </p>
                    <button
                        onClick={() => setIsFlatExpanded(true)}
                        className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                    >
                        Click to View List
                    </button>
                </div>
            )}
        </div>
    );
};
