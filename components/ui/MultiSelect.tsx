'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X, Square, CheckSquare } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    email?: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    valueProperty?: 'id' | 'name';
}

export default function MultiSelect({
    options,
    selectedValues,
    onChange,
    placeholder = 'Select multiple...',
    disabled = false,
    className = '',
    valueProperty = 'name',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 300, placement: 'bottom' });
    const containerRef = useRef<HTMLDivElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            let placement = 'bottom';
            let maxHeight = 300;
            let top = rect.bottom + window.scrollY;

            if (spaceBelow < 300 && spaceAbove > spaceBelow) {
                placement = 'top';
                maxHeight = Math.min(300, spaceAbove - 20);
                top = rect.top + window.scrollY - maxHeight - 5;
            } else {
                maxHeight = Math.min(300, spaceBelow - 20);
            }

            setCoords({
                top: top,
                left: rect.left + window.scrollX,
                width: rect.width,
                maxHeight,
                placement
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isOutsideTrigger = containerRef.current && !containerRef.current.contains(event.target as Node);
            const isOutsidePortal = portalRef.current && !portalRef.current.contains(event.target as Node);

            if (isOutsideTrigger && isOutsidePortal) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const filteredOptions = options.filter((option) =>
        option.name.toLowerCase().includes(search.toLowerCase()) ||
        (option.email && option.email.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleOption = (val: string) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(v => v !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    const selectAll = () => {
        const allFilteredValues = filteredOptions.map(o => o[valueProperty]);
        const newValues = Array.from(new Set([...selectedValues, ...allFilteredValues]));
        onChange(newValues);
    };

    const clearAll = () => {
        const allFilteredValues = filteredOptions.map(o => o[valueProperty]);
        onChange(selectedValues.filter(v => !allFilteredValues.includes(v)));
    };

    const getDisplayLabel = () => {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === options.length && options.length > 0) return 'All Selected';

        const selectedNames = options
            .filter(opt => selectedValues.includes(opt[valueProperty]))
            .map(opt => opt.name);

        if (selectedNames.length <= 2) return selectedNames.join(', ');
        return `${selectedNames.length} items selected`;
    };

    const dropdownList = (
        <div
            ref={portalRef}
            className="fixed z-[999999] mt-1 overflow-hidden rounded-xl bg-white text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm flex flex-col border border-gray-100"
            style={{
                top: `${coords.top - window.scrollY}px`,
                left: `${coords.left - window.scrollX}px`,
                width: `${coords.width}px`,
                height: `${coords.maxHeight}px`
            }}
        >
            <div className="sticky top-0 z-10 bg-white px-3 py-3 border-b border-gray-100 flex flex-col gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full rounded-lg border-0 bg-gray-50 py-2 pl-9 pr-8 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6 transition-all"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearch('');
                            }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="flex justify-between items-center px-1">
                    <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700"
                    >
                        Select All
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
                {filteredOptions.length === 0 ? (
                    <div className="relative cursor-default select-none px-4 py-8 text-gray-500 italic text-center">
                        <span className="block mb-1 text-lg">🔍</span>
                        No results found.
                    </div>
                ) : (
                    filteredOptions.map((option) => {
                        const isSelected = selectedValues.includes(option[valueProperty]);
                        return (
                            <div
                                key={option.id || option.name}
                                className={`
                                    relative cursor-pointer select-none py-2.5 pl-3 pr-10 rounded-lg transition-colors mb-0.5
                                    ${isSelected ? 'bg-orange-50 text-orange-900 group' : 'text-gray-700 hover:bg-gray-50'}
                                `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOption(option[valueProperty]);
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`transition-colors ${isSelected ? 'text-orange-600 font-bold' : 'text-gray-300'}`}>
                                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`block truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                            {option.name}
                                        </span>
                                        {option.email && (
                                            <span className="block truncate text-[10px] text-gray-400">
                                                {option.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isSelected && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                                        <Check className="h-4 w-4" />
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                className={`
                    relative w-full cursor-default rounded-xl bg-gray-50/50 py-3 pl-4 pr-10 text-left border border-gray-200 sm:text-sm sm:leading-6 transition-all
                    ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'cursor-pointer hover:border-orange-300 focus-within:ring-2 focus-within:ring-orange-600'}
                `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex flex-col truncate">
                    <span className={`block truncate ${selectedValues.length === 0 ? 'text-gray-600 italic' : 'text-gray-900 font-bold'}`}>
                        {getDisplayLabel()}
                    </span>
                </div>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </span>
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(dropdownList, document.body)}
        </div>
    );
}
