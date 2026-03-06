import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import {
    Bold, Italic, Underline as UnderlineIcon,
    Link as LinkIcon, AlignLeft, AlignCenter,
    AlignRight, List, ListOrdered, Heading1,
    Heading2, Eraser, Type, Highlighter, Code,
    Image as ImageIcon, Loader2, Upload, Maximize
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    onImageUpload?: (file: File) => Promise<string>;
    placeholder?: string;
}

const ImageNodeView = (props: any) => {
    const { node, updateAttributes, selected } = props;
    const { src, alt, style, textAlign } = node.attrs;
    const imgRef = useRef<HTMLImageElement>(null);

    const onResize = (event: MouseEvent) => {
        if (!imgRef.current) return;

        const startX = event.clientX;
        const startWidth = imgRef.current.clientWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentWidth = startWidth + (moveEvent.clientX - startX);
            const parentWidth = imgRef.current?.parentElement?.clientWidth || 800;
            const widthPercentage = (currentWidth / parentWidth) * 100;
            const clampedWidth = Math.min(Math.max(widthPercentage, 10), 100);

            updateAttributes({
                style: `width: ${clampedWidth}%; height: auto; display: block;`
            });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <NodeViewWrapper className={`image-resizer-wrapper image-align-${textAlign || 'center'}`}>
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                style={{
                    width: style?.match(/width:\s*([^;]+)/)?.[1] || '100%',
                    height: 'auto',
                    cursor: 'default'
                }}
                className={`rounded-xl shadow-lg border border-gray-100 ${selected ? 'outline outline-4 outline-purple-600 outline-offset-4 scale-[1.01]' : ''} transition-all duration-200`}
            />
            {selected && (
                <div
                    className="image-resizer-handle animate-in fade-in zoom-in-50 duration-200"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onResize(e.nativeEvent);
                    }}
                />
            )}
        </NodeViewWrapper>
    );
};

export default function RichTextEditor({ value, onChange, onImageUpload, placeholder }: RichTextEditorProps) {
    const [isSourceMode, setIsSourceMode] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertAtCursor = (text: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + text + value.substring(end);
        onChange(newValue);

        // Restore focus and selection after state update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + text.length, start + text.length);
        }, 0);
    };

    const CustomImage = Image.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                style: {
                    default: 'width: 100%; height: auto; display: block;',
                    parseHTML: element => element.getAttribute('style'),
                    renderHTML: attributes => ({ style: attributes.style }),
                },
                textAlign: {
                    default: 'center',
                    parseHTML: element => element.getAttribute('data-align') || 'center',
                    renderHTML: attributes => ({
                        'data-align': attributes.textAlign,
                        class: `image-align-${attributes.textAlign}`,
                    }),
                },
            };
        },
        addNodeView() {
            return ReactNodeViewRenderer(ImageNodeView);
        },
    });

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-purple-600 underline cursor-pointer',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            CustomImage.configure({
                allowBase64: true,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[350px] p-8 text-gray-800 font-medium leading-relaxed prose-pre:overflow-x-auto prose-pre:max-w-full',
            },
        },
    });

    // Update editor content when value changes externally (e.g., from source mode)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [value, editor]);

    if (!editor) return null;

    const addLink = () => {
        const url = window.prompt('URL');
        if (url) {
            if (isSourceMode) {
                insertAtCursor(`<a href="${url}" class="text-purple-600 underline cursor-pointer">${url}</a>`);
            } else {
                editor.chain().focus().setLink({ href: url }).run();
            }
        }
    };

    const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImageUpload) return;

        try {
            const url = await onImageUpload(file);
            if (isSourceMode) {
                insertAtCursor(`<img src="${url}" style="width: 100%; height: auto; display: block;" class="rounded-xl shadow-lg border border-gray-100" data-align="center">`);
            } else {
                editor.chain()
                    .focus()
                    .setImage({ src: url })
                    .run();
            }
        } catch (error) {
            console.error('Image selection failed:', error);
        } finally {
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const setImageAlign = (align: string) => {
        if (editor.isActive('image')) {
            editor.chain().focus().updateAttributes('image', { textAlign: align }).run();
        } else {
            editor.chain().focus().setTextAlign(align).run();
        }
    };

    const resetImageSize = () => {
        if (editor.isActive('image')) {
            editor.chain().focus().updateAttributes('image', { style: 'width: 100%; height: auto; display: block;' }).run();
        }
    };

    return (
        <div className="border-2 border-gray-200 rounded-[1.5rem] overflow-hidden flex flex-col bg-white">
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
            />
            <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100 flex flex-wrap gap-1 items-center justify-between">
                <div className="flex flex-wrap gap-1 items-center">
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        disabled={isSourceMode}
                        icon={<Bold className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        disabled={isSourceMode}
                        icon={<Italic className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        disabled={isSourceMode}
                        icon={<UnderlineIcon className="h-4 w-4" />}
                    />
                    <div className="w-px h-6 bg-purple-200 mx-1" />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        active={editor.isActive('heading', { level: 1 })}
                        disabled={isSourceMode}
                        icon={<Heading1 className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        active={editor.isActive('heading', { level: 2 })}
                        disabled={isSourceMode}
                        icon={<Heading2 className="h-4 w-4" />}
                    />
                    <div className="w-px h-6 bg-purple-200 mx-1" />
                    <MenuButton
                        onClick={() => setImageAlign('left')}
                        active={editor.isActive({ textAlign: 'left' }) || (editor.isActive('image') && editor.getAttributes('image').textAlign === 'left')}
                        disabled={isSourceMode}
                        icon={<AlignLeft className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => setImageAlign('center')}
                        active={editor.isActive({ textAlign: 'center' }) || (editor.isActive('image') && (editor.getAttributes('image').textAlign === 'center' || !editor.getAttributes('image').textAlign))}
                        disabled={isSourceMode}
                        icon={<AlignCenter className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => setImageAlign('right')}
                        active={editor.isActive({ textAlign: 'right' }) || (editor.isActive('image') && editor.getAttributes('image').textAlign === 'right')}
                        disabled={isSourceMode}
                        icon={<AlignRight className="h-4 w-4" />}
                    />
                    <div className="w-px h-6 bg-purple-200 mx-1" />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        disabled={isSourceMode}
                        icon={<List className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        disabled={isSourceMode}
                        icon={<ListOrdered className="h-4 w-4" />}
                    />
                    <div className="w-px h-6 bg-purple-200 mx-1" />
                    <MenuButton
                        onClick={addLink}
                        active={editor.isActive('link')}
                        icon={<LinkIcon className="h-4 w-4" />}
                    />
                    <div className="flex items-center gap-1">
                        <MenuButton
                            onClick={() => imageInputRef.current?.click()}
                            active={editor.isActive('image')}
                            icon={<ImageIcon className="h-4 w-4" />}
                        />
                        {editor.isActive('image') && !isSourceMode && (
                            <div className="flex bg-white border border-purple-200 rounded-xl p-1 gap-1 shadow-sm animate-in zoom-in-95 duration-200">
                                <button
                                    onClick={resetImageSize}
                                    className="px-2 py-0.5 text-[9px] font-black hover:bg-purple-600 hover:text-white rounded-lg transition-all uppercase tracking-tighter flex items-center gap-1"
                                    title="Reset Size"
                                >
                                    <Maximize className="h-3 w-3" /> FULL
                                </button>
                                <div className="w-px h-3 bg-gray-100 self-center" />
                                <span className="text-[8px] px-2 font-black text-purple-400 uppercase tracking-widest self-center">Free Resize Active</span>
                            </div>
                        )}
                    </div>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        active={editor.isActive('highlight')}
                        disabled={isSourceMode}
                        icon={<Highlighter className="h-4 w-4" />}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().unsetAllMarks().run()}
                        disabled={isSourceMode}
                        icon={<Eraser className="h-4 w-4" />}
                    />
                </div>

                <div className="flex items-center gap-2 border-l border-purple-200 pl-4 ml-1">
                    <button
                        type="button"
                        onClick={() => setIsSourceMode(!isSourceMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSourceMode
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                            : 'text-purple-600 hover:bg-purple-100'
                            }`}
                    >
                        <Code className="h-3.5 w-3.5" />
                        {isSourceMode ? 'Rich Text View' : 'HTML Code'}
                    </button>
                </div>
            </div>

            {isSourceMode ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-8 bg-gray-900 text-emerald-400 font-mono text-sm min-h-[350px] outline-none resize-none leading-relaxed"
                    spellCheck={false}
                />
            ) : (
                <EditorContent editor={editor} />
            )}
        </div>
    );
}

function MenuButton({ onClick, active, icon, disabled }: { onClick: () => void, active?: boolean, icon: React.ReactNode, disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded-lg transition-all ${active
                ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                : 'text-purple-600 hover:bg-purple-100'
                } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
            {icon}
        </button>
    );
}
