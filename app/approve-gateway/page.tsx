'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  LogIn,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ApproveGatewayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'unauthorized' | 'approving' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your administrator session...');
  const [targetGateway, setTargetGateway] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!token || processedRef.current) {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing approval token.');
      }
      return;
    }
    
    processedRef.current = true;
    checkAuthAndProcess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const checkAuthAndProcess = async () => {
    if (!supabase) return;
    try {
      // 1. Check Session (Client Side)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('unauthorized');
        setMessage('You must be logged in as an administrator to approve this change.');
        return;
      }

      // 2. Fetch User Role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData?.role?.includes(8)) {
        setStatus('unauthorized');
        setMessage('Only Super Admins (Role 8) can authorize gateway changes.');
        return;
      }

      // 3. Process Approval via Internal API
      setStatus('approving');
      setMessage('Authorizing payment gateway transition...');

      const response = await fetch('/api/donations/approve-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: user.id })
      });

      const result = await response.json();
      
      if (result.success) {
        setTargetGateway(result.gateway);
        setStatus('success');
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to authorize gateway change.');
      }

    } catch (err: any) {
      console.error('Approval page error:', err);
      setStatus('error');
      setMessage('A system error occurred. Please try again or contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] border border-slate-800 p-10 shadow-3xl text-center relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {status === 'verifying' || status === 'approving' ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-3xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-white tracking-tight">Security Check</h1>
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">{message}</p>
                </div>
              </motion.div>
            ) : status === 'success' ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="relative mx-auto w-24 h-24">
                   <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl" />
                   <div className="relative w-24 h-24 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-black text-white tracking-tighter">Hare Krishna!</h1>
                  <p className="text-slate-300 font-bold leading-relaxed">
                    The payment gateway has been successfully updated to <span className="text-emerald-400 uppercase">{targetGateway}</span>.
                  </p>
                </div>
                <button 
                  onClick={() => router.push('/dashboard/admin/donations')}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
                >
                  Return to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : status === 'unauthorized' ? (
              <motion.div 
                key="unauthorized"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl" />
                  <div className="relative w-24 h-24 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-rose-500" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-black text-rose-500 tracking-tight">Access Denied</h1>
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">{message}</p>
                </div>
                <button 
                  onClick={() => router.push(`/auth/login?next=/approve-gateway?token=${token}`)}
                  className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                >
                  <LogIn className="w-4 h-4" />
                  Login to Admin Account
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-2xl" />
                  <div className="relative w-24 h-24 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-rose-500" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-black text-white tracking-tight">Something went wrong</h1>
                  <p className="text-slate-400 font-bold text-sm leading-relaxed">{message}</p>
                </div>
                <button 
                  onClick={() => router.push('/dashboard/admin/donations')}
                  className="w-full py-5 border-2 border-slate-800 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:text-white hover:border-slate-700 transition-all"
                >
                  Go Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
        </div>
        
        <p className="mt-8 text-center text-slate-600 font-black text-[10px] uppercase tracking-[0.3em]">
           ISKCON Sadhana Security Protocol • 2026
        </p>
      </motion.div>
    </div>
  );
}

export default function ApproveGatewayPage() {
  return (
    <Suspense fallback={null}>
      <ApproveGatewayContent />
    </Suspense>
  );
}
