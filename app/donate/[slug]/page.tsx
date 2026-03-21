'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Contact, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { sadhanaDb } from '@/lib/supabase/sadhanaDb';

import Script from 'next/script';

// Toggle this to true to skip the real payment gateway and simulate a success
const MOCK_MODE = false;
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function DonationPage() {
  const { slug } = useParams();
  const router = useRouter();

  // State
  const [step, setStep] = useState(1);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeGateway, setActiveGateway] = useState('razorpay');

  // Form Data
  const [formData, setFormData] = useState({
    amount: '',
    donorName: '',
    donorEmail: '',
    donorMobile: '',
    donorAddress: '',
    donorPan: ''
  });

  // Fetch target user by slug
  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;
      
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, name, profile_image, center')
          .eq('donation_slug', slug)
          .single();

        if (fetchError || !data) {
          setError('This donation link is invalid or has expired.');
        } else {
          setTargetUser(data);

          // Fetch Active Gateway from Platform Settings
          const { data: settings } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('id', 'active_payment_gateway')
            .single();
          
          if (settings?.value) {
            // Strip any leading/trailing quotes that might come from JSONB storage
            const normalized = String(settings.value).replace(/^["']|["']$/g, '');
            console.log('--- GATEWAY INITIALIZATION ---');
            console.log('Raw Value:', settings.value);
            console.log('Normalized Value:', normalized);
            setActiveGateway(normalized);
          }
        }
      } catch (err) {
        setError('Something went wrong. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [slug]);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const saveDonationToDb = async (paymentId: string, method: string, additionalMeta = {}) => {
    if (!sadhanaDb || !targetUser) return;
    
    const donationData = {
      donor_name: formData.donorName,
      donor_email: formData.donorEmail,
      donor_mobile: formData.donorMobile,
      donor_address: formData.donorAddress,
      donor_pan: formData.donorPan,
      amount: parseFloat(formData.amount),
      payment_status: 'captured',
      payment_method: method,
      payment_id: paymentId,
      txnid: `TXN_${Date.now()}`,
      tag_user_id: targetUser.id,
      center: targetUser.center || null,
      metadata: {
        ...additionalMeta,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    };

    const { error: dbError } = await sadhanaDb
      .from('donations')
      .insert([donationData]);

    if (dbError) throw dbError;
    
    setIsSuccess(true);
    setStep(4);
  };

  const handlePayment = async () => {
    if (!targetUser) return;
    setIsProcessing(true);
    setError('');

    try {
      if (MOCK_MODE) {
        // --- MOCK FLOW ---
        await new Promise(resolve => setTimeout(resolve, 2000));
        await saveDonationToDb(`MOCK_${Date.now()}`, 'Simulated (Mock)', { mock: true });
      } else if (activeGateway === 'razorpay') {
        // --- RAZORPAY FLOW ---
        if (!window.Razorpay) {
          throw new Error('Payment gateway failed to load. Please refresh.');
        }

        console.log('--- RAZORPAY EXECUTION ---');
        console.log('Key ID:', RAZORPAY_KEY_ID);
        
        if (!RAZORPAY_KEY_ID) {
          throw new Error('Payment configuration missing (Key ID). Please contact admin.');
        }

        const options = {
          key: RAZORPAY_KEY_ID,
          amount: Math.round(parseFloat(formData.amount) * 100), // convert to paise
          currency: "INR",
          name: "Voice Gurukul",
          description: `Devotional contribution via ${targetUser.name}`,
          image: targetUser.profile_image || "",
          handler: async function (response: any) {
            try {
              setIsProcessing(true);
              await saveDonationToDb(response.razorpay_payment_id, 'Razorpay', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              });
            } catch (err: any) {
              setError(err.message || "Payment saved, but database update failed.");
            } finally {
              setIsProcessing(false);
            }
          },
          prefill: {
            name: formData.donorName,
            email: formData.donorEmail,
            contact: formData.donorMobile,
          },
          theme: {
            color: "#ea580c", // matches your orange-600
          },
          modal: {
            ondismiss: function() {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (activeGateway === 'easebuzz') {
        // --- EASEBUZZ FLOW ---
        throw new Error('Easebuzz integration is currently being set up. Please switch to Razorpay in Admin for testing.');
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error && step !== 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 px-4">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white text-center max-w-md">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Unavailable</h2>
          <p className="text-slate-500 font-bold mb-8">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-orange-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-12 px-4 relative overflow-hidden flex items-center justify-center">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-orange-200/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-yellow-200/40 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-8 px-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                step >= s ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white text-slate-400 border-2 border-slate-100'
              }`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-2 rounded-full transition-all ${
                  step > s ? 'bg-orange-600' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white flex flex-col overflow-hidden">
          {/* User Header */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-8 text-white relative">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl font-black shadow-inner overflow-hidden">
                {targetUser?.profile_image ? (
                  <img src={targetUser.profile_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  targetUser?.name?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <p className="text-orange-100 font-black uppercase text-[10px] tracking-widest mb-1 opacity-80">Supporting Your Journey</p>
                <h1 className="text-2xl font-black tracking-tight leading-none">Donate to Voice Gurukul</h1>
              </div>
            </div>
            <Heart className="absolute top-6 right-6 w-12 h-12 text-white/10" />
            
            {MOCK_MODE && step !== 4 && (
              <div className="absolute bottom-2 right-4 flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 backdrop-blur-sm rounded-full border border-amber-400/30">
                <Zap className="w-3 h-3 text-amber-300" />
                <span className="text-[8px] font-black uppercase tracking-tighter text-amber-100">Development Mock Mode</span>
              </div>
            )}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Amount (INR)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['501', '1001', '2101', '5001', '10001'].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setFormData({...formData, amount: amt})}
                          className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${
                            formData.amount === amt ? 'bg-orange-50 border-orange-600 text-orange-600' : 'bg-white border-slate-100 text-slate-600 hover:border-orange-200'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300 group-focus-within:text-orange-500 transition-colors">₹</span>
                    <input 
                      type="number"
                      placeholder="Other Amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full pl-12 pr-6 py-5 bg-slate-50 border-none rounded-2xl text-lg font-black text-slate-700 focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-300 outline-none transition-all"
                    />
                  </div>

                  <button 
                    disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                    onClick={handleNext}
                    className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-800/20 hover:bg-slate-900 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    Confirm Amount
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 gap-4">
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-all" />
                      <input 
                        type="text"
                        placeholder="Legal Name (Required)"
                        value={formData.donorName}
                        onChange={(e) => setFormData({...formData, donorName: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-all" />
                        <input 
                          type="email"
                          placeholder="Email ID (Required)"
                          value={formData.donorEmail}
                          onChange={(e) => setFormData({...formData, donorEmail: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                        />
                      </div>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-all" />
                        <input 
                          type="text"
                          placeholder="Mobile (Required)"
                          value={formData.donorMobile}
                          onChange={(e) => setFormData({...formData, donorMobile: e.target.value})}
                          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-all" />
                      <input 
                        type="text"
                        placeholder="Address (Optional)"
                        value={formData.donorAddress}
                        onChange={(e) => setFormData({...formData, donorAddress: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                      />
                    </div>
                    <div className="relative group">
                      <Contact className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-all" />
                      <input 
                        type="text"
                        placeholder="PAN Number (Optional)"
                        value={formData.donorPan}
                        onChange={(e) => setFormData({...formData, donorPan: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={handlePrev}
                      className="w-20 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black transition-all hover:bg-slate-200 flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button 
                      disabled={!formData.donorName || !formData.donorEmail || !formData.donorMobile}
                      onClick={handleNext}
                      className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-800/20 hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                    >
                      Continue to Payment
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-orange-50/50 rounded-3xl border border-orange-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Total Contribution</p>
                      <p className="text-3xl font-black text-orange-900 tracking-tight">₹{formData.amount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <Heart className="w-6 h-6 text-orange-500 fill-orange-500" />
                    </div>
                  </div>

                  <div className="space-y-3 px-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Donor</span>
                      <span className="text-slate-700">{formData.donorName}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>PAN</span>
                      <span className="text-slate-700">{formData.donorPan || 'Not Provided'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Method</span>
                      <span className="text-slate-700">
                        {MOCK_MODE ? 'Simulated' : `${activeGateway.charAt(0).toUpperCase() + activeGateway.slice(1)} Secure`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      disabled={isProcessing}
                      onClick={handlePrev}
                      className="w-20 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black transition-all hover:bg-slate-200 flex items-center justify-center disabled:opacity-50"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button 
                      disabled={isProcessing}
                      onClick={handlePayment}
                      className="flex-1 py-5 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-600/30 hover:bg-orange-700 transition-all flex items-center justify-center gap-3 relative overflow-hidden"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Donate Now
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                      {isProcessing && (
                        <motion.div 
                          className="absolute bottom-0 left-0 h-1 bg-white/30"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2.5 }}
                        />
                      )}
                    </button>
                  </div>
                  
                  <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Secure 256-bit Encrypted Transaction
                  </p>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </motion.div>
                    <motion.div 
                      className="absolute inset-0 rounded-full border-4 border-emerald-500"
                      initial={{ opacity: 1, scale: 0.8 }}
                      animate={{ opacity: 0, scale: 1.5 }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
                    />
                  </div>
                  
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">Donation Successful!</h2>
                  <p className="text-slate-500 font-bold mb-8 leading-relaxed px-6">
                    A big thank you to <span className="text-orange-600">{formData.donorName}</span>. 
                    Your contribution of <span className="text-slate-800">₹{formData.amount}</span> has been received and tagged to {targetUser?.name}.
                  </p>

                  <div className="space-y-4">
                    <button 
                      onClick={() => router.push('/')}
                      className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                    >
                      Back to Community
                    </button>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                       Reference: {Date.now().toString().slice(-10)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Verified Recipient</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Instant Receipt</span>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400/60 uppercase tracking-widest leading-relaxed">
            ISKCON Sadhana Platform • Supporting Spiritual Growth Worldwide
          </p>
        </div>
      </motion.div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
    </div>
  );
}
