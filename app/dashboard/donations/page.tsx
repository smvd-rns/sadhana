'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  Heart, 
  Search, 
  User, 
  Calendar, 
  Mail, 
  Phone, 
  Contact, 
  MapPin, 
  IndianRupee, 
  Loader2, 
  Share2, 
  ExternalLink,
  ClipboardCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/config';
import { fetchUserDonations } from './actions';

export default function MyDonationsPage() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copying, setCopying] = useState(false);
  const [userSlug, setUserSlug] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch donations and user slug
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !supabase) return;

      try {
        // Server actions can't always read auth cookies; authenticate via access token.
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        // 1. Fetch User Slug (to build sharing link)
        const { data: userData } = await supabase
          .from('users')
          .select('donation_slug')
          .eq('id', user.id)
          .single();
        
        if (userData?.donation_slug) setUserSlug(userData.donation_slug);

        // 2. Fetch Donations via server action (bypasses RLS)
        const result = await fetchUserDonations(user.id, accessToken);
        if (result.success && result.donations) {
          setDonations(result.donations);
        } else {
          console.error('Donations fetch failed:', result.error);
        }
      } catch (err) {
        console.error('Error fetching donations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCopyLink = () => {
    if (!userSlug) return;
    const url = `${window.location.origin}/donate/${userSlug}`;
    navigator.clipboard.writeText(url);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const filteredDonations = donations.filter(d => 
    (d.donor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.donor_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.payment_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDonations.length / pageSize);
  const paginatedDonations = filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 p-6 max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-100 rounded-2xl">
              <Heart className="w-6 h-6 text-orange-600 fill-orange-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Donation Collection</h1>
          </div>
          <p className="text-slate-500 font-bold ml-1">Track every contribution received through your personal link</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-8 py-4 bg-orange-600 text-white rounded-[2rem] shadow-xl shadow-orange-600/20 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Contributions</span>
            <span className="text-2xl font-black tracking-tight">₹{totalAmount.toLocaleString()}</span>
          </div>
          
          <button 
            onClick={handleCopyLink}
            disabled={!userSlug}
            className={`flex items-center gap-3 px-8 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all ${
              copying ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-700 border-2 border-slate-100 hover:border-orange-500 hover:text-orange-600'
            }`}
          >
            {copying ? (
              <>
                <ClipboardCheck className="w-4 h-4" />
                Copied Link!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                {userSlug ? 'Share My Link' : 'No Slug Assigned'}
              </>
            )}
          </button>
        </div>
      </div>

      {!userSlug && (
        <div className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-100 flex items-center gap-4">
          <Zap className="w-6 h-6 text-amber-600" />
          <p className="text-sm font-bold text-amber-800">
            You have not been assigned a personalized donation link yet. Please contact an admin to set your <span className="font-black">Donation Slug</span>.
          </p>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Contribution History
            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] text-slate-400 font-black">{donations.length}</span>
          </h2>
          
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search donor or transaction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Donor Detail</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Info</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <Heart className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                        No contributions found matching your search. <br/>
                        Share your link to start receiving donations!
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDonations.length > 0 && paginatedDonations.map((d) => (
                  <tr key={d.id} className="group hover:bg-orange-50/30 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 group-hover:text-orange-600 group-hover:border-orange-200 transition-all">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{d.donor_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5 uppercase tracking-tighter">
                            <Calendar className="w-3 h-3" />
                            {new Date(d.created_at).toLocaleDateString()} at {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <Zap className="w-3 h-3 text-amber-500" />
                          {d.payment_id}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                          <Contact className="w-3 h-3" />
                          PAN: {d.donor_pan || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Mail className="w-3 h-3 text-slate-300" />
                          {d.donor_email}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <Phone className="w-3 h-3 text-slate-300" />
                          {d.donor_mobile}
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-slate-800 tracking-tight">₹{d.amount.toLocaleString()}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-200 mt-1 shadow-sm shadow-emerald-50">Collected</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredDonations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Rows per page:</span>
              {[10, 20, 50].map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1); }}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${pageSize === size ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                >{size}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold text-xs">{((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredDonations.length)} of {filteredDonations.length}</span>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-all font-black text-sm flex items-center justify-center"
              >‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = totalPages <= 5 ? i + 1 : Math.max(1, currentPage - 2) + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                  >{page}</button>
                );
              })}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-all font-black text-sm flex items-center justify-center"
              >›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
