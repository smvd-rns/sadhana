import { Eye, Smartphone, Tablet, Monitor, Paperclip, FileText, Image as ImageIcon, Music, Video, Link as LinkIcon, Bell } from 'lucide-react';
import { useState } from 'react';
import { ManagedEventAttachment } from '@/types';

interface LiveMessagePreviewProps {
    title: string;
    content: string;
    attachments?: ManagedEventAttachment[];
    className?: string;
}

export default function LiveMessagePreview({ title, content, attachments = [], className = '' }: LiveMessagePreviewProps) {
    const [viewMode, setViewMode] = useState<'mobile' | 'tablet' | 'desktop' | 'notification'>('desktop');

    const containerWidths = {
        mobile: 'max-w-[375px]',
        tablet: 'max-w-[600px]',
        desktop: 'max-w-full',
        notification: 'max-w-[375px]'
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-3 w-3" />;
            case 'audio': return <Music className="h-3 w-3" />;
            case 'video': return <Video className="h-3 w-3" />;
            case 'link': return <LinkIcon className="h-3 w-3" />;
            default: return <FileText className="h-3 w-3" />;
        }
    };

    // Helper to strip HTML for notification preview
    const stripHtml = (html: string) => {
        if (typeof window === 'undefined') return html;
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const renderPreview = () => {
        if (viewMode === 'notification') {
            return (
                <div className="relative aspect-[9/16] bg-gray-900 rounded-[3rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden flex flex-col justify-center items-center p-6">
                    {/* Simulated Lock Screen Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-80" />

                    {/* Time/Date on Lock Screen */}
                    <div className="relative z-10 text-white text-center mb-12">
                        <h1 className="text-6xl font-thin tracking-tighter">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h1>
                        <p className="text-sm font-medium opacity-80 uppercase tracking-widest mt-1">
                            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* WhatsApp Style Notification */}
                    <div className="relative z-20 w-full animate-in slide-in-from-top-4 duration-700">
                        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-xl border border-white/20">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-green-500 rounded-md flex items-center justify-center">
                                        <Bell className="h-3 w-3 text-white" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ISKCON CONNECT</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400">now</span>
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-[13px] font-black text-gray-900">{title || 'New Announcement'}</h3>
                                <p className="text-[12px] font-medium text-gray-600 line-clamp-2 leading-snug">
                                    {stripHtml(content) || 'Tap to see the full update...'}
                                </p>
                            </div>
                            {attachments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center gap-2">
                                    <Paperclip className="h-3 w-3 text-green-600" />
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter">
                                        {attachments.length} Attachment{attachments.length > 1 ? 's' : ''} included
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/20 rounded-full" />
                </div>
            );
        }

        return (
            <div className="mx-auto bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden transition-all duration-500">
                {/* Simulated App Header */}
                <div className="bg-purple-600 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full items-center justify-center flex">
                            <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <span className="text-white font-black text-[10px] sm:text-xs tracking-widest uppercase italic">ISKCON Connect</span>
                    </div>
                </div>

                <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
                    {title && (
                        <h2 className="text-lg sm:text-2xl font-black text-gray-900 leading-tight tracking-tight">
                            {title}
                        </h2>
                    )}

                    <div className="w-full h-px bg-gray-100" />

                    <div
                        className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium 
                        prose-p:my-0 prose-headings:text-gray-900 prose-headings:font-black prose-headings:tracking-tight 
                        prose-a:text-purple-600 prose-ul:list-disc prose-ol:list-decimal prose-strong:font-black 
                        prose-img:rounded-2xl prose-img:shadow-lg prose-img:my-6 prose-img:mx-auto text-[14px]"
                        dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-300 italic">No message content drafted yet...</p>' }}
                    />

                    {attachments.length > 0 && (
                        <div className="pt-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <Paperclip className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Resources</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-purple-200 transition-all group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-gray-50 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                                                {getFileIcon(file.type)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">{file.name}</span>
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{file.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer Decoration */}
                    <div className="pt-8 flex flex-col items-center gap-4">
                        <div className="w-12 h-1 bg-gray-100 rounded-full" />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">End of Broadcast</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-200 shrink-0">
                        <Eye className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-[11px] sm:text-[12px] font-black text-gray-900 uppercase tracking-widest leading-none">Intelligence Preview</h4>
                        <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Multi-device visualization</p>
                    </div>
                </div>

                <div className="flex bg-white border border-gray-100 p-1 rounded-xl sm:rounded-2xl gap-0.5 sm:gap-1 shadow-sm w-fit">
                    <button
                        onClick={() => setViewMode('notification')}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 ${viewMode === 'notification' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Bell className="h-3.5 w-3.5" />
                        <span className="hidden xs:block text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none">Notification</span>
                    </button>
                    <div className="w-px h-3 sm:h-4 bg-gray-100 self-center mx-0.5 sm:mx-1" />
                    <button
                        onClick={() => setViewMode('mobile')}
                        className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all ${viewMode === 'mobile' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Mobile Preview"
                    >
                        <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('tablet')}
                        className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all ${viewMode === 'tablet' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Tablet Preview"
                    >
                        <Tablet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('desktop')}
                        className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all ${viewMode === 'desktop' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Desktop Preview"
                    >
                        <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                </div>
            </div>

            <div className={`mx-auto transition-all duration-500 ${containerWidths[viewMode]}`}>
                {renderPreview()}
            </div>
        </div>
    );
}
