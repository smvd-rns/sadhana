'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Users, Layout, Send, User, Smile, Code, Type, RefreshCw, Layers, Shield, Globe, Building2, MapPin, Check, X, Info, Search, Calendar, Star, Pin } from 'lucide-react';

import { supabase } from '@/lib/supabase/config';
import { toast } from 'react-hot-toast';
import { createEvent } from '@/lib/actions/events';
import MultiSelect from '@/components/ui/MultiSelect';
import SearchableSelect from '@/components/ui/SearchableSelect';
import RichTextEditor from '@/components/ui/RichTextEditor';
import LiveMessagePreview from '@/components/ui/LiveMessagePreview';
import AttachmentPicker from '@/components/ui/AttachmentPicker';
import { roleOptions, ashramOptions, campOptions } from '@/lib/utils/event-constants';
import { useAuth } from '@/components/providers/AuthProvider';
import { getActiveSadhanaSupabase } from '@/lib/supabase/sadhana';
import { ManagedEventAttachment } from '@/types';

interface AdminEventComposeProps {
    onSuccess: () => void;
}

export default function AdminEventCompose({ onSuccess }: AdminEventComposeProps) {
    const { userData } = useAuth();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<ManagedEventAttachment[]>([]);
    const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map());
    const [selectedTemples, setSelectedTemples] = useState<string[]>([]);
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [isImportant, setIsImportant] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);



    // Filters
    const [targetAshrams, setTargetAshrams] = useState<string[]>([]);
    const [targetRoles, setTargetRoles] = useState<string[]>([]);
    const [targetTemples, setTargetTemples] = useState<string[]>([]);
    const [targetCenters, setTargetCenters] = useState<string[]>([]);
    const [targetCamps, setTargetCamps] = useState<string[]>([]);

    // Meta
    const [temples, setTemples] = useState<any[]>([]);
    const [centers, setCenters] = useState<any[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [recipientCount, setRecipientCount] = useState(0);
    const [selectedUsersList, setSelectedUsersList] = useState<any[]>([]);
    const [showUserList, setShowUserList] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [modalCenterFilter, setModalCenterFilter] = useState('');
    const [excludedUserIds, setExcludedUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Warm up backend functions
        fetch('/api/upload/google-drive', { method: 'HEAD' }).catch(() => { });

        const fetchFilterData = async () => {
            setLoadingFilters(true);
            try {
                if (!userData || !supabase) return;

                const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
                const normalizedRoles = userRoles.map(r => String(r));

                const isSuperAdmin = normalizedRoles.some(r => r === '8' || r === 'super_admin');
                const isTempleAdmin = normalizedRoles.some(r => ['11', '12', '13', '21', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(r));
                const isCenterAdmin = normalizedRoles.some(r => ['14', '15', '16', 'project_advisor', 'project_manager', 'acting_manager'].includes(r));

                let templeQuery = supabase.from('temples').select('id, name').order('name');
                let centerQuery = supabase.from('centers').select('id, name, temple_name').order('name');

                // Filter for Temple-level Admin (MD, Director, etc.)
                if (isTempleAdmin && !isSuperAdmin) {
                    templeQuery = templeQuery.or(`managing_director_id.eq.${userData.id},director_id.eq.${userData.id},central_voice_manager_id.eq.${userData.id},yp_id.eq.${userData.id}`);
                }

                // Filter for Center-level Admin (PM, Advisor, etc.)
                if (isCenterAdmin && !isSuperAdmin) {
                    centerQuery = centerQuery.or(`project_manager_id.eq.${userData.id},project_advisor_id.eq.${userData.id},acting_manager_id.eq.${userData.id}`);
                }

                const [{ data: templeData }, { data: centerData }] = await Promise.all([
                    templeQuery,
                    centerQuery
                ]);

                let filteredTemples = templeData?.map(t => ({ id: t.name, name: t.name })) || [];
                let filteredCenters = centerData?.map(c => ({ id: c.name, name: c.name, temple_name: c.temple_name })) || [];

                // If MD/Temple Admin, also restrict centers to those belonging to their temples
                if (isTempleAdmin && !isSuperAdmin && templeData) {
                    const allowedTempleNames = templeData.map(t => t.name);
                    filteredCenters = filteredCenters.filter(c => allowedTempleNames.includes(c.temple_name));
                }

                setTemples(filteredTemples);
                setCenters(filteredCenters);
            } catch (error) {
                console.error('Error fetching filters:', error);
            } finally {
                setLoadingFilters(false);
            }
        };
        fetchFilterData();
    }, [userData, supabase]);

    const handleImageUpload = async (file: File): Promise<string> => {
        // Just return a local URL and store the file for later upload
        const localUrl = URL.createObjectURL(file);
        setPendingImages(prev => new Map(prev).set(localUrl, file));
        return localUrl;
    };

    const handleFetchMatchingUsers = async () => {
        setIsFetchingUsers(true);
        setExcludedUserIds(new Set()); // Reset exclusions on new search
        try {
            let query = supabase!.from('users').select('id, name, email, hierarchy, current_temple, current_center, center', { count: 'exact' });

            if (targetAshrams.length > 0 && targetAshrams.length < ashramOptions.length) {
                query = query.in('hierarchy->>ashram', targetAshrams);
            }

            if (targetRoles.length > 0 && targetRoles.length < roleOptions.length) {
                // Use .in() for cleaner and more robust filtering
                query = query.in('role', targetRoles);
            }

            if (targetTemples.length > 0 && targetTemples.length < temples.length) {
                const values = `(${targetTemples.map(v => `"${v}"`).join(',')})`;
                query = query.or(`current_temple.in.${values},hierarchy->>temple.in.${values},hierarchy->>currentTemple.in.${values}`);
            }

            if (targetCenters.length > 0 && targetCenters.length < centers.length) {
                const values = `(${targetCenters.map(v => `"${v}"`).join(',')})`;
                query = query.or(`current_center.in.${values},center.in.${values},hierarchy->>center.in.${values},hierarchy->>currentCenter.in.${values}`);
            }

            // Apply global role-based restrictions to the final query
            const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
            const normalizedRoles = userRoles.map(r => String(r));

            const isSuperAdmin = normalizedRoles.some(r => r === '8' || r === 'super_admin');
            const isTempleAdmin = normalizedRoles.some(r => ['11', '12', '13', '21', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(r));
            const isCenterAdmin = normalizedRoles.some(r => ['14', '15', '16', 'project_advisor', 'project_manager', 'acting_manager'].includes(r));

            if (isTempleAdmin && !isSuperAdmin) {
                // If Temple Admin (MD, Director, etc.), restrict to users in their assigned temples
                const allowedTempleNames = temples.map(t => t.name);
                if (allowedTempleNames.length > 0) {
                    const values = `(${allowedTempleNames.map(v => `"${v}"`).join(',')})`;
                    query = query.or(`current_temple.in.${values},hierarchy->>temple.in.${values},hierarchy->>currentTemple.in.${values}`);
                } else {
                    setRecipientCount(0);
                    setSelectedUsersList([]);
                    setIsFetchingUsers(false);
                    return;
                }
            } else if (isCenterAdmin && !isSuperAdmin) {
                // If Center Admin (PM, Advisor, etc.), restrict to users in their centers
                const allowedCenterNames = centers.map(c => c.name);
                if (allowedCenterNames.length > 0) {
                    const values = `(${allowedCenterNames.map(v => `"${v}"`).join(',')})`;
                    query = query.or(`current_center.in.${values},center.in.${values},hierarchy->>center.in.${values},hierarchy->>currentCenter.in.${values}`);
                } else {
                    setRecipientCount(0);
                    setSelectedUsersList([]);
                    setIsFetchingUsers(false);
                    return;
                }
            }

            const { data, count, error } = await query;

            if (error) throw error;

            setRecipientCount(count || 0);
            setSelectedUsersList(data || []);
            toast.success(`Found ${count || 0} matching users`);
        } catch (error: any) {
            console.error('Error fetching matching users:', error);
            toast.error('Failed to calculate audience');
        } finally {
            setIsFetchingUsers(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setExcludedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleAllMatched = (filteredUsers: any[]) => {
        if (excludedUserIds.size === filteredUsers.length) {
            // All matched are currently excluded -> Include all
            setExcludedUserIds(new Set());
        } else {
            // Include some or all -> Exclude all currently filtered
            setExcludedUserIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.error('Please fill in title and message');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Ensure 'event material' parent folder exists
            const findParentFormData = new FormData();
            findParentFormData.append('action', 'find-folder');
            findParentFormData.append('folderName', 'event material');

            const findParentRes = await fetch('/api/upload/google-drive', {
                method: 'POST',
                body: findParentFormData,
            });
            const { folderId: existingParentId } = await findParentRes.json();

            let eventMaterialFolderId = existingParentId;

            if (!eventMaterialFolderId) {
                const createParentFormData = new FormData();
                createParentFormData.append('action', 'create-folder');
                createParentFormData.append('folderName', 'event material');

                const createParentRes = await fetch('/api/upload/google-drive', {
                    method: 'POST',
                    body: createParentFormData,
                });
                const { folderId: newParentId } = await createParentRes.json();
                eventMaterialFolderId = newParentId;
                if (!eventMaterialFolderId) throw new Error('Failed to create "event material" folder');
            }

            // 2. Create a dated folder inside 'event material'
            const folderName = `${eventDate} - ${title.substring(0, 50)}`;

            const folderFormData = new FormData();
            folderFormData.append('action', 'create-folder');
            folderFormData.append('folderName', folderName);
            folderFormData.append('parentFolderId', eventMaterialFolderId);

            const folderRes = await fetch('/api/upload/google-drive', {
                method: 'POST',
                body: folderFormData,
            });

            if (!folderRes.ok) throw new Error('Failed to create announcement folder in Drive');
            const { folderId } = await folderRes.json();

            // 2. Upload pending images from the editor
            let updatedMessage = message;
            const materials: ManagedEventAttachment[] = [];

            for (const [localUrl, file] of Array.from(pendingImages.entries())) {
                // Only upload if it's still in the message
                if (message.includes(localUrl)) {
                    const imgFormData = new FormData();
                    imgFormData.append('file', file);
                    imgFormData.append('userName', userData?.name || 'Admin');
                    imgFormData.append('folderId', folderId);

                    const imgRes = await fetch('/api/upload/google-drive', {
                        method: 'POST',
                        body: imgFormData,
                    });

                    if (!imgRes.ok) throw new Error(`Failed to upload image: ${file.name}`);
                    const { data } = await imgRes.json();

                    const finalUrl = data.directImageUrl || data.webViewLink;
                    // Replace the local URL with the final Drive URL in the HTML
                    updatedMessage = updatedMessage.split(localUrl).join(finalUrl);

                    // Add to materials for DB tracking
                    materials.push({
                        type: 'image',
                        name: file.name,
                        url: finalUrl,
                        fileId: data.fileId,
                        mimeType: file.type
                    });
                }
                URL.revokeObjectURL(localUrl);
            }

            // 3. Upload attachments
            for (const att of attachments) {
                if (att.file) {
                    const attFormData = new FormData();
                    attFormData.append('file', att.file);
                    attFormData.append('userName', userData?.name || 'Admin');
                    attFormData.append('folderId', folderId);

                    const attRes = await fetch('/api/upload/google-drive', {
                        method: 'POST',
                        body: attFormData,
                    });

                    if (!attRes.ok) throw new Error(`Failed to upload attachment: ${att.name}`);
                    const { data } = await attRes.json();

                    materials.push({
                        type: att.type,
                        name: att.name,
                        url: data.directImageUrl || data.webViewLink,
                        fileId: data.fileId,
                        mimeType: att.file.type
                    });
                } else if (att.url) {
                    // It's a link or already uploaded
                    materials.push(att);
                }
            }

            // 4. Submit the final event data
            await createEvent({
                createdBy: userData?.id || '',
                title,
                eventDate: new Date(eventDate),
                message: updatedMessage,
                attachments: materials, // This will be stored in the regular 'attachments' field AND used for 'event_materials' table
                targetAshrams,
                targetRoles,
                targetTemples,
                targetCenters,
                targetCamps,
                excludedUserIds: Array.from(excludedUserIds),
                reachedCount: activeRecipientCount,
                isImportant: isImportant,
                isPinned: isPinned
            });



            toast.success('Announcement broadcast successfully!');
            handleResetAll();
            onSuccess();
        } catch (error: any) {
            console.error('Submission failed:', error);
            toast.error(error.message || 'Failed to post event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetAll = () => {
        // Revoke all local URLs to prevent memory leaks
        pendingImages.forEach((_, url) => URL.revokeObjectURL(url));
        attachments.forEach(att => {
            if (att.file && att.url) URL.revokeObjectURL(att.url);
        });

        setTitle('');
        setEventDate(new Date().toISOString().split('T')[0]);
        setIsImportant(false);
        setIsPinned(false);
        setMessage('');


        setAttachments([]);
        setPendingImages(new Map());
        setSelectedTemples([]);
        setTargetAshrams([]);
        setTargetRoles([]);
        setTargetTemples([]);
        setTargetCenters([]);
        setTargetCamps([]);
        setRecipientCount(0);
        setSelectedUsersList([]);
        setExcludedUserIds(new Set());
    };

    const activeRecipientCount = recipientCount - excludedUserIds.size;

    // Filter centers based on selected temples
    const filteredCenterOptions = centers.filter(center => {
        if (targetTemples.length === 0) return true;
        // Check if center.temple_name matches any of the selected temple names
        return targetTemples.some(selectedTemple =>
            String(selectedTemple).trim().toLowerCase() === String(center.temple_name).trim().toLowerCase()
        );
    });

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100 flex flex-col xl:flex-row items-start min-h-[600px] animate-in slide-in-from-bottom-6 duration-1000">
            {/* Left Column: Compose */}
            <div className="xl:flex-[2.5] min-w-0 p-5 md:p-8 xl:p-10 border-b xl:border-b-0 xl:border-r border-gray-50 space-y-8">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-purple-100 text-purple-600 rounded-2xl shrink-0">
                        <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Compose Message</h2>
                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Draft your broadcast update</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest ml-1">Subject Line</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Important Update: New Features Added"
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-[1.25rem] focus:bg-white focus:border-purple-500 transition-all font-bold text-gray-900 placeholder:text-gray-300 outline-none shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest ml-1">Event Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-[1.25rem] focus:bg-white focus:border-purple-500 transition-all font-bold text-gray-900 outline-none shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border-2 border-amber-100/50 cursor-pointer transition-all hover:bg-amber-100/50" onClick={() => setIsImportant(!isImportant)}>
                            <div className={`p-2 rounded-lg transition-all ${isImportant ? 'bg-amber-500 text-white' : 'bg-white text-gray-400'}`}>
                                <Star className={`h-4 w-4 ${isImportant ? 'fill-current' : ''}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Mark as Important</p>
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">Highlight this in user inboxes</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={isImportant}
                                onChange={(e) => setIsImportant(e.target.checked)}
                                className="w-5 h-5 rounded-md border-amber-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border-2 border-rose-100/50 cursor-pointer transition-all hover:bg-rose-100/50" onClick={() => setIsPinned(!isPinned)}>
                            <div className={`p-2 rounded-lg transition-all ${isPinned ? 'bg-rose-500 text-white' : 'bg-white text-gray-400'}`}>
                                <Pin className={`h-4 w-4 ${isPinned ? 'fill-current rotate-45' : ''}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black text-rose-900 uppercase tracking-widest">Pin to Top</p>
                                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-tight">Keep this at the top of the inbox</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="w-5 h-5 rounded-md border-rose-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>



                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Message Content</label>
                            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-tight">Advanced Editor Active</span>
                        </div>

                        <RichTextEditor
                            value={message}
                            onChange={setMessage}
                            onImageUpload={handleImageUpload}
                            placeholder="Write your update here..."
                        />
                    </div>

                    <div className="pt-8">
                        <AttachmentPicker
                            attachments={attachments}
                            onChange={setAttachments}
                        />
                    </div>

                    <div className="pt-6 sm:pt-8 border-t border-gray-100">
                        <LiveMessagePreview title={title} content={message} attachments={attachments} />
                    </div>
                </div>
            </div>

            <div className="xl:w-96 xl:shrink-0 bg-gray-50/50 p-5 md:p-8 xl:p-10">
                <div className="flex flex-col gap-10 sticky top-10">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campaign Audience</h4>
                            <button
                                onClick={() => recipientCount > 0 && setShowUserList(true)}
                                className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tighter flex items-end gap-2 hover:text-purple-600 transition-colors text-left"
                                disabled={recipientCount === 0}
                            >
                                {activeRecipientCount} <span className="text-[10px] sm:text-sm text-gray-400 mb-1 sm:mb-2 font-bold uppercase tracking-tight">recipients selected</span>
                            </button>
                            <div className="w-full h-1 bg-gray-200 rounded-full mt-4 relative overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-purple-600 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (activeRecipientCount / 1000) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Targeted capacity reached</p>
                        </div>

                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="h-3 w-3 text-purple-600" /> Filters
                            </h4>
                            <button
                                onClick={handleResetAll}
                                className="text-[10px] font-black text-purple-600 uppercase hover:text-purple-700 transition-colors"
                            >
                                Reset All
                            </button>
                        </div>

                        <div className="space-y-4">
                            {(!userData?.role || !Array.isArray(userData.role) ? [userData?.role] : userData.role).some(r => [8, 11, 12, 13, 21, 'super_admin', 'managing_director', 'director', 'central_voice_manager', 'youth_preacher'].includes(r as any)) && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">Temple</label>
                                    <MultiSelect options={temples} selectedValues={targetTemples} onChange={setTargetTemples} placeholder="All Temples" valueProperty="id" disabled={loadingFilters} />
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">Specific Centers</label>
                                <MultiSelect
                                    options={filteredCenterOptions}
                                    selectedValues={targetCenters}
                                    onChange={setTargetCenters}
                                    placeholder={targetTemples.length > 0 ? "Centers in selected Temples" : "All Centers"}
                                    valueProperty="id"
                                    disabled={loadingFilters}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">Level / Role</label>
                                <MultiSelect options={roleOptions} selectedValues={targetRoles} onChange={setTargetRoles} placeholder="All Roles" valueProperty="id" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">Target Ashram</label>
                                <MultiSelect options={ashramOptions} selectedValues={targetAshrams} onChange={setTargetAshrams} placeholder="All Ashrams" valueProperty="id" />
                            </div>
                            <button
                                onClick={handleFetchMatchingUsers}
                                disabled={isFetchingUsers}
                                className="w-full py-4 bg-purple-50 border-2 border-dashed border-purple-200 text-purple-700 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-100 hover:border-purple-400 transition-all text-xs uppercase tracking-widest shadow-sm"
                            >
                                {isFetchingUsers ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                {isFetchingUsers ? 'Calculating...' : 'Select Matching Users'}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-300 hover:bg-purple-700 hover:shadow-purple-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {isSubmitting ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        {isSubmitting ? 'Transmitting...' : 'Send Announcement Now'}
                    </button>
                </div>
            </div>

            {/* Recipient List Modal */}
            {showUserList && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Recipient Audit</h3>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-[14px] font-black text-purple-600 tracking-tight">{activeRecipientCount}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active recipients out of {recipientCount} matched</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowUserList(false)}
                                    className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all"
                                >
                                    <X className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={modalSearchTerm}
                                        onChange={(e) => setModalSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-3 h-9 bg-white border border-gray-200 rounded-lg text-[11px] font-bold focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                                <SearchableSelect
                                    options={centers}
                                    value={modalCenterFilter}
                                    onChange={setModalCenterFilter}
                                    placeholder="All Centers"
                                    className="min-w-[160px]"
                                    triggerClassName="h-9 px-3 py-0 border border-gray-200 rounded-lg text-[11px] font-bold shadow-none flex items-center"
                                    valueProperty="name"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-white border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 w-[50px]">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                checked={excludedUserIds.size === 0 && selectedUsersList.length > 0}
                                                onChange={() => toggleAllMatched(selectedUsersList)}
                                            />
                                        </th>
                                        <th className="px-2 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">User</th>
                                        <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                                        <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedUsersList
                                        .filter(user => {
                                            const matchesSearch = !modalSearchTerm ||
                                                user.name?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                                user.email?.toLowerCase().includes(modalSearchTerm.toLowerCase());
                                            const userCenter = user.current_center || user.center || user.hierarchy?.currentCenter || user.hierarchy?.center;
                                            const matchesCenter = !modalCenterFilter || userCenter === modalCenterFilter;
                                            return matchesSearch && matchesCenter;
                                        })
                                        .map((user, idx) => {
                                            const isExcluded = excludedUserIds.has(user.id);
                                            return (
                                                <tr
                                                    key={user.id || idx}
                                                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isExcluded ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                                    onClick={() => toggleUserSelection(user.id)}
                                                >
                                                    <td className="px-6 py-2.5">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                            checked={!isExcluded}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                toggleUserSelection(user.id);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0">
                                                                {user.name?.charAt(0) || '?'}
                                                            </div>
                                                            <span className="font-black text-gray-900 text-[11px] truncate max-w-[120px]">{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2.5 text-[10px] font-bold text-gray-500 truncate max-w-[150px]">{user.email}</td>
                                                    <td className="px-6 py-2.5">
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="text-[10px] font-black text-gray-900">
                                                                {user.current_center || user.center || user.hierarchy?.currentCenter || user.hierarchy?.center || 'No Center'}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                {user.current_temple || user.hierarchy?.currentTemple || user.hierarchy?.temple || 'No Hub'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                            {selectedUsersList.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 text-xs font-bold">No matching users found.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setShowUserList(false)}
                                className="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
