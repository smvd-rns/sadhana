'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, CheckCircle, Search, Filter, X } from 'lucide-react'
import { getUserFilesPaginated, bulkDeleteFiles } from '../../uploader/actions'
import SelectableFileListView from '../../uploader/components/SelectableFileListView'
import PaginationControls from '../../uploader/components/PaginationControls'
import ScrollReveal from '../../../components/ui/ScrollReveal'

export default function DeleteFileManager() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // URL State
    const currentPage = Number(searchParams.get('page')) || 1
    const pageSize = Number(searchParams.get('pageSize')) || 10

    // Data State
    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(0)

    // Search State
    const [searchQuery, setSearchQuery] = useState('')

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchFiles = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getUserFilesPaginated(searchQuery, 'all', currentPage, pageSize)
            setFiles(result.files || [])
            setTotal(result.total || 0)
            setTotalPages(result.totalPages || 0)
        } catch (error) {
            console.error('Error fetching files:', error)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, searchQuery])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFiles()
        }, 300)
        return () => clearTimeout(timer)
    }, [fetchFiles, searchQuery])

    const updateUrl = (updates: Record<string, string | number>) => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(updates).forEach(([key, value]) => {
            if (!value) params.delete(key)
            else params.set(key, String(value))
        })
        if (params.get('page') === '1') params.delete('page')
        if (params.get('pageSize') === '10') params.delete('pageSize')
        router.replace(`${pathname}?${params.toString()}`)
    }

    // Selection Handlers
    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleToggleAll = (currentFiles: any[]) => {
        if (currentFiles.every(f => selectedIds.has(f.id))) {
            // Unselect all on this page
            const newSelected = new Set(selectedIds)
            currentFiles.forEach(f => newSelected.delete(f.id))
            setSelectedIds(newSelected)
        } else {
            // Select all on this page
            const newSelected = new Set(selectedIds)
            currentFiles.forEach(f => newSelected.add(f.id))
            setSelectedIds(newSelected)
        }
    }

    // Delete Handlers
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        setIsDeleting(true)
        try {
            const result = await bulkDeleteFiles(Array.from(selectedIds))
            if (result.success) {
                // Success
                setIsDeleteModalOpen(false)
                setSelectedIds(new Set())
                await fetchFiles()
            } else {
                alert(`Error: ${result.error}`)
            }
        } catch (error) {
            console.error('Delete failed:', error)
            alert('An unexpected error occurred.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="w-full space-y-8 pb-24 sm:pb-0">
            <ScrollReveal direction="up" delay={200}>
                {/* Header / Toolbar */}
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/40 flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-4 z-30">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-orange-500" />
                            File Selection
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            <span className="font-semibold text-orange-600">{total}</span> files found in repository
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-80 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search files by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm text-gray-900 placeholder-gray-400 shadow-inner"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                </button>
                            )}
                        </div>

                        {/* Desktop Delete Content */}
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            disabled={selectedIds.size === 0}
                            className={`hidden md:flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg duration-300
                                ${selectedIds.size > 0
                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-red-500/30 hover:scale-105 active:scale-95'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            <Trash2 size={20} />
                            <span>Delete ({selectedIds.size})</span>
                        </button>
                    </div>
                </div>
            </ScrollReveal>

            {/* Mobile Fixed Delete Bar */}
            <div className={`fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-red-100 p-4 rounded-2xl shadow-2xl md:hidden z-50 transition-all duration-300 transform ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}>
                <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">
                            {selectedIds.size}
                        </span>
                        Selected
                    </span>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        <Trash2 size={18} />
                        Delete Items
                    </button>
                </div>
            </div>

            {/* List */}
            <ScrollReveal direction="up" delay={400}>
                {loading ? (
                    <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-white/40 p-12 text-center">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Loading Repository...</h3>
                        <p className="mt-2 text-gray-500 max-w-sm mx-auto">Please wait while we fetch your files.</p>
                    </div>
                ) : (
                    <SelectableFileListView
                        files={files}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        onToggleAll={handleToggleAll}
                    />
                )}
            </ScrollReveal>

            {/* Pagination */}
            {!loading && totalPages > 0 && (
                <ScrollReveal direction="up" delay={500}>
                    <div className="bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-lg border border-white/40 max-w-full overflow-hidden">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={(p) => {
                                updateUrl({ page: p })
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            onPageSizeChange={(s) => updateUrl({ pageSize: s, page: 1 })}
                        />
                    </div>
                </ScrollReveal>
            )}

            {/* Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-scale-up border border-white/20 relative">
                        {/* Decorative background */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-red-50 to-orange-50"></div>

                        <div className="p-8 text-center relative z-10">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-red-50">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete {selectedIds.size} Files?</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                This action is permanent and cannot be undone. These files will be removed from your cloud storage immediately.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 px-6 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-colors border border-gray-200"
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2 transform active:scale-95"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-5 h-5" />
                                            <span>Confirm</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
