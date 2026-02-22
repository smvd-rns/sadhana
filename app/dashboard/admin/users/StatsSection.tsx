import React, { useMemo } from 'react';
import { User } from '@/types';
import { Users, UserPlus, Shield, Briefcase, Crown, Star } from 'lucide-react';
import { getRoleHierarchyNumber } from '@/lib/utils/roles';

interface StatsSectionProps {
    users: User[];
}

export default function StatsSection({ users }: StatsSectionProps) {
    const stats = useMemo(() => {
        const total = users.length;
        const pending = users.filter(u => u.verificationStatus === 'pending').length;

        // Role Categories
        const leadership = users.filter(u => {
            const roles = Array.isArray(u.role) ? u.role : [u.role];
            return roles.some(r => {
                const num = getRoleHierarchyNumber(r);
                return num >= 8; // Super Admin (8) to OC (17)
            });
        }).length;

        const management = users.filter(u => {
            const roles = Array.isArray(u.role) ? u.role : [u.role];
            return roles.some(r => {
                const num = getRoleHierarchyNumber(r);
                return num >= 4 && num <= 7; // Center Admin (4) to Zonal Admin (7)
            });
        }).length;

        const counselors = users.filter(u => {
            const roles = Array.isArray(u.role) ? u.role : [u.role];
            return roles.some(r => r === 'counselor' || r === 2 || r === 'voice_manager' || r === 3);
        }).length;

        // Growth (Mock for now, or based on created_at if available)
        // We can just show "Live" or similar if no history

        return {
            total,
            pending,
            leadership,
            management,
            counselors
        };
    }, [users]);

    const cards = [
        {
            title: 'Total Users',
            value: stats.total,
            icon: Users,
            gradient: 'from-blue-500 via-indigo-500 to-violet-500',
            shadow: 'shadow-blue-500/20',
            desc: 'Active members'
        },
        {
            title: 'Pending Approvals',
            value: stats.pending,
            icon: UserPlus,
            gradient: 'from-amber-400 via-orange-500 to-red-500',
            shadow: 'shadow-orange-500/20',
            desc: 'Action required'
        },
        {
            title: 'Leadership Team',
            value: stats.leadership,
            icon: Crown,
            gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
            shadow: 'shadow-teal-500/20',
            desc: 'Admins & Directors'
        },
        {
            title: 'Management',
            value: stats.management,
            icon: Briefcase,
            gradient: 'from-pink-500 via-rose-500 to-red-600',
            shadow: 'shadow-rose-500/20',
            desc: 'Zone/State/City/Center'
        },
        {
            title: 'Voice Team',
            value: stats.counselors,
            icon: Star,
            gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
            shadow: 'shadow-purple-500/20',
            desc: 'Counselors & Voice Managers'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6 mb-8">
            {cards.map((card, index) => (
                <div
                    key={card.title}
                    className={`relative overflow-hidden rounded-2xl md:rounded-[2rem] p-4 md:p-6 bg-white border border-gray-100 shadow-lg ${card.shadow} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group`}
                >
                    {/* Background Gradient Blob */}
                    <div className={`absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full blur-2xl -mr-8 -mt-8 md:-mr-10 md:-mt-10 transition-opacity duration-300 group-hover:opacity-20`} />

                    <div className="relative z-10">
                        <div className={`inline-flex p-2 md:p-3 rounded-xl md:rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-md mb-3 md:mb-4 transform transition-transform duration-300 group-hover:rotate-6`}>
                            <card.icon className="w-4 h-4 md:w-6 md:h-6" />
                        </div>

                        <div className="space-y-0.5 md:space-y-1">
                            <h3 className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-wider">{card.title}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl md:text-3xl font-black text-gray-900 font-display">
                                    {card.value.toLocaleString()}
                                </span>
                            </div>
                            <p className={`text-[9px] md:text-xs font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent truncate`}>
                                {card.desc}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
