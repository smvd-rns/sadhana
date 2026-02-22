'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    trend?: {
        value: string;
        positive: boolean;
    };
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    description,
    icon: Icon,
    color,
    bgColor,
    trend
}) => {
    // Mapping flat bg colors to vibrant gradients
    const gradientMap: Record<string, string> = {
        'bg-blue-50': 'from-indigo-500 via-indigo-600 to-blue-700 shadow-indigo-200/50',
        'bg-amber-50': 'from-amber-400 via-orange-500 to-orange-600 shadow-orange-200/50',
        'bg-indigo-50': 'from-violet-500 via-purple-600 to-indigo-700 shadow-purple-200/50',
        'bg-purple-50': 'from-fuchsia-500 via-purple-600 to-violet-700 shadow-fuchsia-200/50',
        'bg-emerald-50': 'from-emerald-400 via-teal-500 to-teal-600 shadow-emerald-200/50',
        'bg-rose-50': 'from-rose-400 via-pink-500 to-rose-600 shadow-rose-200/50',
    };

    const gradient = gradientMap[bgColor] || 'from-gray-600 to-gray-800 shadow-gray-200/50';

    return (
        <div className="group relative bg-white p-6 rounded-[2.5rem] shadow-[0_15px_40px_rgb(0,0,0,0.03)] border border-gray-100/50 hover:shadow-[0_25px_60px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 overflow-hidden">
            {/* Soft decorative glow background */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-10 bg-gradient-to-br ${gradient}`} />
            <div className={`absolute -left-10 -bottom-10 w-24 h-24 rounded-full blur-3xl opacity-5 bg-gradient-to-tr ${gradient}`} />

            <div className="relative flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-gray-500 transition-colors">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </h3>
                    </div>

                    {trend && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${trend.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            } shadow-sm border border-black/5`}>
                            {trend.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {trend.value}
                            <span className="text-gray-400 font-bold ml-1.5 opacity-60">VS LAST MONTH</span>
                        </div>
                    )}
                </div>

                <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ring-4 ring-white`}>
                    <Icon className="w-7 h-7" />
                </div>
            </div>

            {description && (
                <div className="mt-6 pt-5 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[11px] leading-relaxed text-gray-400 group-hover:text-gray-600 transition-colors font-bold uppercase tracking-wide">
                        {description}
                    </p>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:scale-150 transition-transform duration-500" />
                </div>
            )}
        </div>
    );
};
