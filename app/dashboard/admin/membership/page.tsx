'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { 
    Search, Filter, CreditCard, Sparkles, Loader2, 
    Edit2, CheckCircle2, AlertCircle, RefreshCw,
    Download, Users, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface MembershipRecord {
    id: string;
    user_id: string;
    membership_id: string;
    year: number;
    temple_code: string;
    sequential_num: number;
    created_at: string;
    users: {
        name: string;
        email: string;
    };
}

export default function AdminMembershipPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [records, setRecords] = useState<MembershipRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [bulkGenerating, setBulkGenerating] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MembershipRecord | null>(null);
    const [newId, setNewId] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    
    // Pagination state
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        // Check access
        if (userData) {
            const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            if (!currentUserRoles.includes(8) && !currentUserRoles.includes('super_admin')) {
                router.push('/dashboard');
                return;
            }
        }

        fetchRecords();
    }, [userData, router, currentPage, pageSize]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const offset = (currentPage - 1) * pageSize;
            const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
            const response = await fetch(`/api/admin/membership?limit=${pageSize}&offset=${offset}&t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });
            const result = await response.json();
            if (response.ok) {
                setRecords(result.data);
                setTotalCount(result.count || 0);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast.error('Failed to fetch membership records: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkGenerate = async () => {
        setIsBulkModalOpen(false);
        setBulkGenerating(true);
        try {
            const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
            const response = await fetch('/api/admin/membership/bulk-generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const result = await response.json();
            if (response.ok) {
                toast.success(`Successfully generated ${result.count} new IDs!`);
                fetchRecords();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast.error('Bulk generation failed: ' + error.message);
        } finally {
            setBulkGenerating(false);
        }
    };

    const handleUpdateId = async () => {
        if (!editingRecord || !newId) return;
        
        try {
            const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
            const response = await fetch(`/api/admin/membership/${editingRecord.user_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ membershipId: newId })
            });
            
            if (response.ok) {
                toast.success('Membership ID updated');
                setEditingRecord(null);
                fetchRecords();
            } else {
                const res = await response.json();
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast.error('Update failed: ' + error.message);
        }
    };

    const filteredRecords = useMemo(() => {
        return records.filter(r => 
            r.users?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.membership_id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [records, searchQuery]);

    if (loading && records.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Membership Management</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage and generate unique IDs for all platform members.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            if (currentPage === 1) {
                                fetchRecords();
                            } else {
                                setCurrentPage(1);
                            }
                        }}
                        disabled={loading}
                        className="p-3 rounded-2xl bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl active:scale-95 group"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        disabled={bulkGenerating}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                        {bulkGenerating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                        <span>Bulk Generate IDs</span>
                    </button>
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search name, email, or ID in this page..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border-2 border-slate-900 focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 font-bold text-slate-900 placeholder:text-slate-400 shadow-xl shadow-slate-200 transition-all bg-white"
                        />
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</span>
                            <select 
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white border-slate-200 rounded-lg text-xs font-bold py-1 px-2 focus:ring-orange-500 focus:border-orange-500"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <Users className="w-4 h-4" />
                            <span>{totalCount} Total Members</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Member</th>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Membership ID</th>
                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Generated On</th>
                                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{record.users?.name || 'Unknown'}</span>
                                            <span className="text-xs text-slate-500 font-medium">{record.users?.email || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 font-mono text-sm font-black border border-orange-100">
                                            <CreditCard className="w-3.5 h-3.5 opacity-50" />
                                            {record.membership_id}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-bold text-slate-500">
                                            {new Date(record.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => {
                                                setEditingRecord(record);
                                                setNewId(record.membership_id);
                                            }}
                                            className="p-2.5 rounded-xl text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-400">
                                            <div className="p-4 rounded-full bg-slate-50">
                                                <Search className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-sm font-bold uppercase tracking-widest">No records found on this page</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Page {currentPage} of {Math.max(1, totalPages)}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                // Simple sliding window logic could go here, for now just show first 5
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                                            currentPage === pageNum 
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                                            : 'text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-slate-300 mx-1">...</span>}
                        </div>
                        <button
                            disabled={currentPage === totalPages || totalPages === 0 || loading}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 rounded-2xl bg-orange-100 text-orange-600">
                                <Edit2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Edit Membership ID</h3>
                                <p className="text-sm text-slate-500 font-medium">{editingRecord.users?.name || 'Unknown User'}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Manual ID Update</label>
                                <input
                                    type="text"
                                    value={newId}
                                    onChange={(e) => setNewId(e.target.value.toUpperCase())}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-slate-200 focus:ring-4 focus:ring-orange-100 focus:border-orange-500 font-mono font-black text-lg transition-all"
                                />
                                <p className="text-[10px] text-amber-600 font-bold px-1 mt-2">
                                    Warning: Manually changing the ID might break sequence numbering logic. Use with caution.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setEditingRecord(null)}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateId}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-gray-900 text-white font-bold shadow-lg shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Generate Confirmation Modal */}
            <ConfirmationModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onConfirm={handleBulkGenerate}
                title="Bulk Generate IDs"
                message="This will generate unique Membership IDs for all eligible members who do not have one yet. This action cannot be undone."
                confirmText="Generate Now"
                type="warning"
                isLoading={bulkGenerating}
            />
        </div>
    );
}
