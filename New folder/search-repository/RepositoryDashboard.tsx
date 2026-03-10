'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import ThumbnailGrid from '../uploader/components/ThumbnailGrid'
import FileListView from '../uploader/components/FileListView'
import PaginationControls from '../components/PaginationControls'
import FilePreviewModal from '../uploader/components/FilePreviewModal'
import { getAllPreachers, getPublicFileStats, incrementFileView } from './actions'
import {
    Search, FileText, Image, Video, File, Upload, FolderSync, Filter,
    Grid3x3, List, User, Loader2, HardDrive, FileType, CheckCircle2,
    MoreHorizontal, ArrowUp, ArrowDown, Trash2, Music
} from 'lucide-react'

export type ViewMode = 'grid' | 'list'

export default function RepositoryDashboard() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Derived state from URL - Single Source of Truth
    const currentPage = Number(searchParams.get('page')) || 1
    const pageSize = Number(searchParams.get('pageSize')) || 10
    const searchQuery = searchParams.get('q') || ''
    const fileTypeFilter = searchParams.get('type') || 'all'
    const preacherFilter = searchParams.get('preacher') || 'all'
    const uploadMethodFilter = searchParams.get('method') || 'all' // New param for congruency
    const currentView = (searchParams.get('view') as ViewMode) || 'grid'
    const currentSort = searchParams.get('sort') || 'newest'

    const [files, setFiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [selectedFile, setSelectedFile] = useState<any | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [preachers, setPreachers] = useState<any[]>([])
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

    const [isPreacherOpen, setIsPreacherOpen] = useState(false)
    const [preacherSearch, setPreacherSearch] = useState('')

    // Auto-focus logic
    useEffect(() => {
        if (searchParams.get('focus') === '1') {
            const el = document.getElementById('search-input')
            if (el) {
                // Wait for animations/layout to settle
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.focus({ preventScroll: true })
                }, 300)
            }
        }
    }, [searchParams])

    // Stats State
    const [stats, setStats] = useState({
        total: 0,
        images: 0,
        videos: 0,
        documents: 0,
        directUpload: 0,
        driveScan: 0,
        totalSize: 0
    })

    // Helper to update URL without circular dependency issues
    const updateUrl = useCallback((updates: Record<string, string | number>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                params.delete(key)
            } else {
                params.set(key, String(value))
            }
        })

        // Clean up parameters to keep URL clean
        if (params.get('type') === 'all') params.delete('type')
        if (params.get('preacher') === 'all') params.delete('preacher')
        if (params.get('method') === 'all') params.delete('method')
        if (params.get('page') === '1') params.delete('page')
        if (params.get('pageSize') === '10') params.delete('pageSize')
        if (params.get('view') === 'grid') params.delete('view')
        if (params.get('sort') === 'newest') params.delete('sort')
        if (!params.get('q')) params.delete('q')

        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, router, pathname])

    const fetchFiles = useCallback(async () => {
        // Only set hard loading on initial load or search change
        // For standard pagination, we might just want to show a spinner overlay or similar, 
        // but for now keeping it simple.
        setLoading(true)

        try {
            // Safety check: Don't fetch if query is too short (unless empty/all)
            if (searchQuery.length > 0 && searchQuery.length < 3) {
                setLoading(false)
                return
            }

            // 1. Fetch Files IMMEDIATELY (Fetch Count = False)
            // This allows the list to render asap
            import('./actions').then(({ getAllFilesPaginated, getRepositoryFileCount }) => {

                // A. Fire off the data request
                getAllFilesPaginated(
                    searchQuery,
                    fileTypeFilter,
                    currentPage,
                    pageSize,
                    currentSort,
                    preacherFilter,
                    false // Do not fetch count
                ).then(result => {
                    setFiles(result.files || [])
                    setLoading(false) // Data is ready! stop loading
                })

                // B. Fire off the count request separately
                // This updates pagination controls when ready
                getRepositoryFileCount(
                    searchQuery,
                    fileTypeFilter,
                    preacherFilter
                ).then(result => {
                    const total = result.total || 0
                    setTotal(total)
                    setTotalPages(Math.ceil(total / pageSize))
                })
            })

        } catch (error) {
            // Silently handle errors
            setFiles([])
            setTotal(0)
            setTotalPages(0)
            setLoading(false)
        }
    }, [searchQuery, fileTypeFilter, preacherFilter, currentPage, pageSize, currentSort])

    // Load Preachers and Stats IMMEDIATELY to show counts as soon as possible
    useEffect(() => {
        const loadSecondaryData = async () => {
            try {
                // 1. Fetch fast data (Preachers + Counts)
                const [preachersList, statsResult] = await Promise.all([
                    getAllPreachers(),
                    getPublicFileStats()
                ])
                setPreachers(preachersList)
                if (statsResult.success && statsResult.stats) {
                    setStats(prev => ({ ...prev, ...statsResult.stats, totalSize: 0 }))
                }

                // 2. Lazy load heavy data (Total Size) - still keep this separate if it's slow
                import('./actions').then(async ({ getTotalFileSize }) => {
                    const sizeResult = await getTotalFileSize()
                    if (sizeResult.success) {
                        setStats(prev => ({ ...prev, totalSize: sizeResult.totalSize }))
                    }
                })

            } catch (error) {
                console.error('Error fetching secondary data:', error)
            }
        }

        loadSecondaryData()
    }, [])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    // Local state for search input to allow instant typing
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
    const [isInputFocused, setIsInputFocused] = useState(false)

    // Sync local state with URL param only when necessary
    useEffect(() => {
        // Only overwrite local input when the user is NOT actively typing (input not focused).
        if (!isInputFocused && searchQuery !== localSearchQuery) {
            setLocalSearchQuery(searchQuery)
        }
    }, [searchQuery, isInputFocused])

    // Debounce the URL update to avoid flooding the server
    const debouncedSearch = useDebouncedCallback((query: string) => {
        // Double check in callback
        if (query.length > 0 && query.length < 3) return
        updateUrl({ q: query, page: 1 })
    }, 500)

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setLocalSearchQuery(query)

        // Strict Gate: Only trigger search logic if empty (clear) or valid length
        // This prevents the debounce timer from even starting for invalid queries
        if (query.length === 0 || query.length >= 3) {
            debouncedSearch(query)
        }
    }

    const handlePreacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateUrl({ preacher: e.target.value, page: 1 })
    }

    // Sort Mapping needed because simple string vs structured
    // 'newest' | 'views' vs 'date' | 'name' | 'size' | 'type'
    // The previous implementation used 'newest' | 'views'.
    // The new UI uses sort fields (name, date, size) + order.
    // For consistency with existing backend of this page, let's map:
    // date desc -> newest
    // (We might need to update backend action if we want full sort support like admin page)
    // admin/files/page.tsx has local sorting. 
    // This page has server-side sorting but only supports 'newest' and 'views'.
    // To fully replicate admin experience, we should stick to what the backend supports OR update backend.
    // For now, let's map 'date' to 'newest' and 'views' to 'views' and maybe ignore others or implement simplified map.
    // Actually, to keep it simple, let's just stick to the basic sort this page supports but use the UI from Admin?
    // Admin UI has: Name, Date, Size buttons.
    // Current backend supports: Created At (Newest) and Views.
    // Let's just use a simplified Sort UI closer to what was here or adapt the backend?
    // "Replicate UI" implies adapting the functionality.
    // Let's keep the backend simple: The Action supports `sortBy: 'newest' | 'views'`.
    // I will adapt the Sort UI to just toggle between "Date" (Newest) and "Views" for now to avoid breaking backend, 
    // or I can modify getAllFilesPaginated to support more sorts if I have time. 
    // Given the request "keep everything same", I'll try to emulate the look.
    // I'll add buttons for "Date" and "Views".

    // UI Helpers
    const formatTotalSize = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        if (bytes === 0) return '0 Bytes'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    const handleFileClick = async (file: any) => {
        setSelectedFile(file)
        setIsPreviewOpen(true)

        // Increment view count in backend
        // We don't await this to keep UI snappy, but we catch errors
        incrementFileView(file.id).catch(err => console.error("Failed to increment view", err))

        // Optimistically update view count in local state
        setFiles(prevFiles => prevFiles.map(f =>
            f.id === file.id ? { ...f, views: (f.views || 0) + 1 } : f
        ))
    }



    return (
        <div className="w-full space-y-6">

            {/* Statistics Cards - Vibrant Solid Classic Design */}
            <div className="max-w-7xl mx-auto -mt-4 sm:-mt-6 mb-6 sm:mb-10 relative z-20">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-6">
                    {/* Total Files */}
                    <div className="group relative bg-white border border-green-100 rounded-xl sm:rounded-3xl p-2 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 sm:w-24 sm:h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative flex flex-row items-center justify-center gap-2 sm:flex-col sm:text-center sm:gap-3">
                            <div className="p-1.5 sm:p-3 bg-green-100/90 rounded-lg sm:rounded-2xl flex-shrink-0">
                                <FileText className="w-4 h-4 sm:w-7 sm:h-7 text-green-600" />
                            </div>
                            <div className="min-w-0 text-center sm:text-left sm:sm:text-center">
                                <span className="block text-sm sm:text-3xl font-bold text-gray-800 tracking-tight">
                                    <CountUp end={stats.total} />
                                </span>
                                <p className="text-[8px] sm:text-xs font-black text-green-600 uppercase tracking-tighter sm:tracking-widest leading-none">Files</p>
                            </div>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="group relative bg-white border border-blue-100 rounded-xl sm:rounded-3xl p-2 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 sm:w-24 sm:h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative flex flex-row items-center justify-center gap-2 sm:flex-col sm:text-center sm:gap-3">
                            <div className="p-1.5 sm:p-3 bg-blue-100/90 rounded-lg sm:rounded-2xl flex-shrink-0">
                                <Image className="w-4 h-4 sm:w-7 sm:h-7 text-blue-600" />
                            </div>
                            <div className="min-w-0 text-center">
                                <span className="block text-sm sm:text-3xl font-bold text-gray-800 tracking-tight">
                                    <CountUp end={stats.images} />
                                </span>
                                <p className="text-[8px] sm:text-xs font-black text-blue-600 uppercase tracking-tighter sm:tracking-widest leading-none">Images</p>
                            </div>
                        </div>
                    </div>

                    {/* Videos */}
                    <div className="group relative bg-white border border-red-100 rounded-xl sm:rounded-3xl p-2 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 sm:w-24 sm:h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative flex flex-row items-center justify-center gap-2 sm:flex-col sm:text-center sm:gap-3">
                            <div className="p-1.5 sm:p-3 bg-red-100/90 rounded-lg sm:rounded-2xl flex-shrink-0">
                                <Video className="w-4 h-4 sm:w-7 sm:h-7 text-red-600" />
                            </div>
                            <div className="min-w-0 text-center">
                                <span className="block text-sm sm:text-3xl font-bold text-gray-800 tracking-tight">
                                    <CountUp end={stats.videos} />
                                </span>
                                <p className="text-[8px] sm:text-xs font-black text-red-600 uppercase tracking-tighter sm:tracking-widest leading-none">Videos</p>
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="group relative bg-white border border-purple-100 rounded-xl sm:rounded-3xl p-2 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 sm:w-24 sm:h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative flex flex-row items-center justify-center gap-2 sm:flex-col sm:text-center sm:gap-3">
                            <div className="p-1.5 sm:p-3 bg-purple-100/90 rounded-lg sm:rounded-2xl flex-shrink-0">
                                <FileText className="w-4 h-4 sm:w-7 sm:h-7 text-purple-600" />
                            </div>
                            <div className="min-w-0 text-center">
                                <span className="block text-sm sm:text-3xl font-bold text-gray-800 tracking-tight">
                                    <CountUp end={stats.documents} />
                                </span>
                                <p className="text-[8px] sm:text-xs font-black text-purple-600 uppercase tracking-tighter sm:tracking-widest leading-none">Docs</p>
                            </div>
                        </div>
                    </div>

                    {/* Storage */}
                    <div className="col-span-2 sm:col-span-1 group relative bg-white border border-gray-200 rounded-xl sm:rounded-3xl p-2 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 sm:w-24 sm:h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 sm:-mr-8 sm:-mt-8 opacity-40 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative flex flex-row items-center justify-center gap-2 sm:flex-col sm:text-center sm:gap-3">
                            <div className="p-1.5 sm:p-3 bg-gray-100/90 rounded-lg sm:rounded-2xl flex-shrink-0">
                                <HardDrive className="w-4 h-4 sm:w-7 sm:h-7 text-gray-600" />
                            </div>
                            <div className="min-w-0 text-center">
                                <span className="block text-xs sm:text-2xl font-bold text-gray-800 tracking-tight truncate">
                                    <CountUp end={stats.totalSize} formatter={formatTotalSize} />
                                </span>
                                <p className="text-[8px] sm:text-xs font-black text-gray-500 uppercase tracking-tighter sm:tracking-widest leading-none">Size</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar - Colorful Solid Design */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg shadow-orange-900/5 mb-6 border-b-4 border-orange-400 relative z-30">
                <div className="flex flex-col gap-5">
                    {/* Top Area: Controls */}
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                        {/* Search - Grows to fill space */}
                        <div className="relative flex-grow group w-full">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                            </div>
                            <input
                                id="search-input"
                                type="text"
                                value={localSearchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                placeholder="Search files (min 3 chars)..."
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50/80 border-2 border-gray-200/80 focus:bg-white rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-gray-900 placeholder:text-gray-400 transition-all font-medium text-base hover:bg-gray-100/80 hover:border-gray-300"
                            />
                            {localSearchQuery.length > 0 && localSearchQuery.length < 3 && (
                                <div className="absolute top-full left-0 mt-1 pl-4 text-xs text-orange-600 font-bold animate-pulse tracking-wide">
                                    Type {3 - localSearchQuery.length} more character{3 - localSearchQuery.length > 1 ? 's' : ''} to search...
                                </div>
                            )}
                        </div>

                        {/* Secondary Controls - Stack on mobile, row on Desktop */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {/* Preacher Select - Custom Searchable Dropdown */}
                            <div className="relative w-full sm:w-64 z-50">
                                <button
                                    onClick={() => {
                                        setIsPreacherOpen(!isPreacherOpen)
                                        setPreacherSearch('') // Reset search when opening
                                    }}
                                    className={`w-full pl-4 pr-10 py-3 text-left rounded-xl text-sm font-bold transition-all shadow-sm relative border-2 ${preacherFilter !== 'all' ? 'border-orange-500 bg-orange-50 text-orange-800' : 'bg-gray-50 border-gray-200/80 hover:border-gray-300 hover:bg-gray-100/80 text-gray-700'}`}
                                >
                                    <span className="block truncate">
                                        {preacherFilter === 'all'
                                            ? 'All Preachers'
                                            : preachers.find(p => p.id === preacherFilter)?.full_name || 'All Preachers'}
                                    </span>
                                    <User className={`absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 pointer-events-none ${preacherFilter !== 'all' ? 'text-orange-600' : 'text-gray-400'}`} />
                                </button>

                                {isPreacherOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-[60]"
                                            onClick={() => setIsPreacherOpen(false)}
                                        ></div>
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-[61] animate-in fade-in zoom-in-95 duration-200">
                                            {/* Search Box */}
                                            <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={preacherSearch}
                                                        onChange={(e) => setPreacherSearch(e.target.value)}
                                                        placeholder="Search preacher..."
                                                        className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 outline-none"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>

                                            {/* List */}
                                            <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                                                <button
                                                    onClick={() => { updateUrl({ preacher: 'all', page: 1 }); setIsPreacherOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between group transition-colors ${preacherFilter === 'all' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    <span>All Preachers</span>
                                                    {preacherFilter === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                                                </button>

                                                {preachers
                                                    .filter(p => p.full_name.toLowerCase().includes(preacherSearch.toLowerCase()))
                                                    .map((preacher) => (
                                                        <button
                                                            key={preacher.id}
                                                            onClick={() => { updateUrl({ preacher: preacher.id, page: 1 }); setIsPreacherOpen(false); }}
                                                            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between group transition-colors ${preacherFilter === preacher.id ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <span className="truncate">{preacher.full_name}</span>
                                                            {preacherFilter === preacher.id && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                                                        </button>
                                                    ))}

                                                {preachers.filter(p => p.full_name.toLowerCase().includes(preacherSearch.toLowerCase())).length === 0 && (
                                                    <div className="text-center py-4 text-xs text-gray-400 italic">
                                                        No preachers found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* View Toggle */}
                            <div className="flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/80 flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                                <button
                                    onClick={() => updateUrl({ view: 'grid' })}
                                    className={`p-2 rounded-lg transition-all flex-1 sm:flex-none flex justify-center ${currentView === 'grid' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                                    title="Grid View"
                                >
                                    <Grid3x3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => updateUrl({ view: 'list' })}
                                    className={`p-2 rounded-lg transition-all flex-1 sm:flex-none flex justify-center ${currentView === 'list' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                                    title="List View"
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Area: Filters + Sort (Unified Row) */}
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex flex-col md:flex-row gap-3 w-full">
                            {/* All Filters and Sort in one flow - Horizontally scrollable on mobile */}
                            <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
                                {/* Type Filters */}
                                <button
                                    onClick={() => updateUrl({ type: 'all', page: 1 })}
                                    className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${fileTypeFilter === 'all' ? 'bg-green-500 text-white shadow-md shadow-green-500/20 translate-y-[-2px]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    title="All Types"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className={`${fileTypeFilter === 'all' ? 'inline' : 'hidden lg:inline'}`}>All Types</span>
                                </button>
                                <button
                                    onClick={() => updateUrl({ type: 'images', page: 1 })}
                                    className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${fileTypeFilter === 'images' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 translate-y-[-2px]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    title="Images"
                                >
                                    <Image className="w-4 h-4" />
                                    <span className={`${fileTypeFilter === 'images' ? 'inline' : 'hidden lg:inline'}`}>Images</span>
                                </button>
                                <button
                                    onClick={() => updateUrl({ type: 'video', page: 1 })}
                                    className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${fileTypeFilter === 'video' ? 'bg-red-500 text-white shadow-md shadow-red-500/20 translate-y-[-2px]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    title="Videos"
                                >
                                    <Video className="w-4 h-4" />
                                    <span className={`${fileTypeFilter === 'video' ? 'inline' : 'hidden lg:inline'}`}>Videos</span>
                                </button>
                                <button
                                    onClick={() => updateUrl({ type: 'doc', page: 1 })}
                                    className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${fileTypeFilter === 'doc' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 translate-y-[-2px]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    title="Documents"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className={`${fileTypeFilter === 'doc' ? 'inline' : 'hidden lg:inline'}`}>Docs</span>
                                </button>

                                {/* More Options Dropdown - Fixed Overlay */}
                                <div className="relative flex-shrink-0">
                                    <button
                                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                                        className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${['pdf', 'excel', 'ppt', 'zip', 'audio'].includes(fileTypeFilter) || isMoreMenuOpen ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 translate-y-[-2px]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                        <span className="hidden lg:inline">More</span>
                                    </button>

                                    {isMoreMenuOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-[100] bg-black/5"
                                                onClick={() => setIsMoreMenuOpen(false)}
                                            ></div>

                                            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:translate-y-2 w-auto sm:w-48 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl p-1.5 z-[101] animate-in fade-in zoom-in-95 duration-200">
                                                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                                                    <button onClick={() => { updateUrl({ type: 'audio', page: 1 }); setIsMoreMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${fileTypeFilter === 'audio' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <Music className="w-3.5 h-3.5 text-pink-500" /> Audio
                                                    </button>
                                                    <button onClick={() => { updateUrl({ type: 'pdf', page: 1 }); setIsMoreMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${fileTypeFilter === 'pdf' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
                                                    </button>
                                                    <button onClick={() => { updateUrl({ type: 'excel', page: 1 }); setIsMoreMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${fileTypeFilter === 'excel' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <FileType className="w-3.5 h-3.5 text-green-500" /> Sheets
                                                    </button>
                                                    <button onClick={() => { updateUrl({ type: 'ppt', page: 1 }); setIsMoreMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${fileTypeFilter === 'ppt' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <FileText className="w-3.5 h-3.5 text-orange-500" /> Slides
                                                    </button>
                                                    <button onClick={() => { updateUrl({ type: 'zip', page: 1 }); setIsMoreMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 ${fileTypeFilter === 'zip' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                        <FolderSync className="w-3.5 h-3.5 text-yellow-500" /> Zip
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>


                                <div className="w-px h-8 bg-gray-200 mx-2 hidden sm:block flex-shrink-0"></div>

                                {/* Sort Options */}
                                <span className="text-xs font-bold text-gray-400 hidden sm:inline-block pl-2 flex-shrink-0 tracking-wider uppercase">Sort:</span>

                                <button
                                    onClick={() => {
                                        const newSort = currentSort === 'name_asc' ? 'name_desc' : 'name_asc'
                                        updateUrl({ sort: newSort, page: 1 })
                                    }}
                                    className={`flex-shrink-0 px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 capitalize ${['name_asc', 'name_desc'].includes(currentSort) ? 'bg-orange-100 text-orange-700 shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Name
                                    {currentSort === 'name_asc' && <ArrowDown className="w-3.5 h-3.5" />}
                                    {currentSort === 'name_desc' && <ArrowUp className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                    onClick={() => {
                                        const newSort = currentSort === 'newest' ? 'oldest' : 'newest'
                                        updateUrl({ sort: newSort, page: 1 })
                                    }}
                                    className={`flex-shrink-0 px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 capitalize ${['newest', 'oldest'].includes(currentSort) ? 'bg-orange-100 text-orange-700 shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Date
                                    {currentSort === 'newest' && <ArrowDown className="w-3.5 h-3.5" />}
                                    {currentSort === 'oldest' && <ArrowUp className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={() => {
                                        const newSort = currentSort === 'views_desc' ? 'views_asc' : 'views_desc'
                                        updateUrl({ sort: newSort, page: 1 })
                                    }}
                                    className={`flex-shrink-0 px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 capitalize ${['views_desc', 'views_asc'].includes(currentSort) ? 'bg-orange-100 text-orange-700 shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Views
                                    {currentSort === 'views_desc' && <ArrowDown className="w-3.5 h-3.5" />}
                                    {currentSort === 'views_asc' && <ArrowUp className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Loading State */}
            {loading && (
                <div className="text-center py-16 animate-fade-in flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 border-r-pink-500 border-b-purple-500 animate-spin"></div>
                    </div>
                    <p className="mt-6 text-gray-600 font-bold tracking-wide animate-pulse">Loading Repository...</p>
                </div>
            )}

            {/* Files Grid/List */}
            {!loading && (
                <>
                    <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 animate-scale-in transition-all duration-300 hover:shadow-xl overflow-hidden">
                        {currentView === 'grid' ? (
                            <ThumbnailGrid files={files} onFileClick={handleFileClick} />
                        ) : (
                            <FileListView files={files} onFileClick={handleFileClick} />
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 mt-6 animate-slide-up">
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                pageSize={pageSize}
                                total={total}
                                onPageChange={(page) => { updateUrl({ page }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                onPageSizeChange={(size) => updateUrl({ pageSize: size, page: 1 })}
                            />
                        </div>
                    )}
                </>
            )}

            {/* File Preview Modal */}
            {isPreviewOpen && selectedFile && (
                <FilePreviewModal file={selectedFile} onClose={() => { setIsPreviewOpen(false); setSelectedFile(null); }} />
            )}
        </div>
    )
}

// Helper Component for Animated Counting
function CountUp({ end, duration = 2000, formatter = (val: number) => val.toString() }: { end: number, duration?: number, formatter?: (val: number) => string }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = currentTime - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function for smoother effect (easeOutExpo)
            const ease = (x: number) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);

            setCount(Math.floor(ease(percentage) * end));

            if (progress < duration) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        if (end > 0) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            setCount(0);
        }

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        }
    }, [end, duration]);

    return <>{formatter(count)}</>;
}
