'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getUsersByCounselorEmail } from '@/lib/supabase/counselors';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { User, SadhanaReport } from '@/types';
import {
  Users, Loader2, Mail, Phone, MapPin, Building2, UserCircle,
  TrendingUp, Sparkles, ChevronLeft, ChevronRight, ChevronDown, FileCheck,
  Check, X, AlertCircle, Calendar, ShieldCheck, Search, Filter,
  Clock, Award, History, ArrowRight, ShieldAlert, Lock, Shield, Edit, Plus, Trash2, Heart
} from 'lucide-react';
import { getRoleDisplayName, getHighestRole } from '@/lib/utils/roles';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/config';

interface ProfileRequest {
  id: string;
  user_id: string;
  requested_changes: any;
  current_values: any;
  status: 'pending' | 'approved' | 'rejected';
  admin_feedback: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    hierarchy?: any;
  };
}

interface StudentWithProgress extends User {
  avgSoulPercent?: number;
  progressRating?: string;
  progressColor?: string;
  progressBgColor?: string;
  totalReports?: number;
}

export default function CounselorPage() {
  const { user, userData } = useAuth();
  const router = useRouter();

  // Data Mapping Loader (MD Parity)
  const mapUserData = (user: any): User => {
    const normalizedRole = Array.isArray(user.role) ? user.role : [user.role || 1];
    const hierarchy = {
      ...(user.hierarchy || {}),
      currentTemple: user.current_temple || user.hierarchy?.currentTemple,
      currentCenter: user.current_center || user.hierarchy?.currentCenter,
      center: user.center || user.hierarchy?.center,
      counselor: user.counselor || user.hierarchy?.counselor,
      otherCenter: user.other_center || user.hierarchy?.otherCenter,
      otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
      ashram: user.ashram || user.hierarchy?.ashram,
    };

    return {
      ...user,
      birthDate: user.birth_date,
      role: normalizedRole,
      hierarchy: hierarchy,
      createdAt: user.created_at ? new Date(user.created_at) : undefined,
      updatedAt: user.updated_at ? new Date(user.updated_at) : undefined,
    } as User;
  };

  const [activeTab, setActiveTab] = useState<'spiritual-approvals' | 'new-dev-approvals' | 'sadhana-reports'>('sadhana-reports');
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Requests State
  const [profileRequests, setProfileRequests] = useState<ProfileRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // New Dev Approvals State
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats State
  const [stats, setStats] = useState({
    devotees: 0,
    pendingSpiritual: 0,
    pendingRegistrations: 0,
    loading: true
  });

  // Bulk Selection State
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedPendingUserIds, setSelectedPendingUserIds] = useState<string[]>([]);

  // Individual Request State
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState('');

  // Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: 'approved' | 'rejected' | null;
    count: number;
    requestId?: string | null;
    mode: 'single' | 'bulk';
    source: 'spiritual' | 'registration';
  }>({ isOpen: false, type: null, count: 0, requestId: null, mode: 'single', source: 'spiritual' });

  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [targetForRejection, setTargetForRejection] = useState<{ id: string, name: string } | null>(null);

  // Check if user has counselor role
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2) ||
    userRoles.includes('care_giver') || userRoles.includes(20) ||
    userRoles.includes('senior_counselor') || userRoles.includes(3);

  const loadStudents = useCallback(async () => {
    if (!userData?.email) return;

    setLoading(true);
    try {
      const assignedStudents = await getUsersByCounselorEmail(userData.email);

      // Fetch spiritual progress for each student
      const studentsWithProgress = await Promise.all(
        assignedStudents.map(async (student) => {
          try {
            // Get last 30 days of reports for quick overview
            const reports = await fetchSadhanaHistory(30, student.id);

            if (reports.length === 0) {
              return {
                ...student,
                avgSoulPercent: 0,
                progressRating: 'No Reports',
                progressColor: 'text-gray-600',
                progressBgColor: 'bg-gray-100',
                totalReports: 0,
              };
            }

            const avgSoulPercent = reports.reduce((sum, r) => sum + (r.soulPercent || 0), 0) / reports.length;
            const avgSoulPercentNum = parseFloat(avgSoulPercent.toFixed(1));

            let progressRating = '';
            let progressColor = '';
            let progressBgColor = '';

            if (avgSoulPercentNum >= 80) {
              progressRating = 'Excellent';
              progressColor = 'text-green-600';
              progressBgColor = 'bg-green-100';
            } else if (avgSoulPercentNum >= 50) {
              progressRating = 'Good Progress';
              progressColor = 'text-blue-600';
              progressBgColor = 'bg-blue-100';
            } else if (avgSoulPercentNum > 0) {
              progressRating = 'Needs Improvement';
              progressColor = 'text-orange-600';
              progressBgColor = 'bg-orange-100';
            } else {
              progressRating = 'No Progress';
              progressColor = 'text-gray-600';
              progressBgColor = 'bg-gray-100';
            }

            return {
              ...student,
              avgSoulPercent: avgSoulPercentNum,
              progressRating,
              progressColor,
              progressBgColor,
              totalReports: reports.length,
            };
          } catch (error) {
            console.error(`Error loading progress for student ${student.id}:`, error);
            return {
              ...student,
              avgSoulPercent: 0,
              progressRating: 'N/A',
              progressColor: 'text-gray-600',
              progressBgColor: 'bg-gray-100',
              totalReports: 0,
            };
          }
        })
      );

      setStudents(studentsWithProgress);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }, [userData?.email]);

  const loadProfileRequests = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole) return;
    setLoadingRequests(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/profile-requests?status=${approvalStatus}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const json = await response.json();
      if (json.success) {
        setProfileRequests(json.data);
      }
    } catch (error) {
      console.error('Error loading profile requests:', error);
      toast.error('Failed to load profile requests');
    } finally {
      setLoadingRequests(false);
    }
  }, [userData?.email, hasCounselorRole, approvalStatus]);

  const loadPendingUsers = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole || !supabase) return;
    setLoadingPending(true);
    try {
      const adminEmail = userData.email.trim().toLowerCase();

      // Mirror MD logic: Fetch ALL pending users, filter in-memory
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('verification_status', 'pending');

      if (fetchError) throw fetchError;

      // 1. Identification
      const { data: adminCounselor } = await supabase
        .from('counselors')
        .select('id, name')
        .eq('email', adminEmail)
        .maybeSingle();

      const adminCounselorId = adminCounselor?.id;
      const adminCounselorName = adminCounselor?.name?.trim().toLowerCase();

      // 2. Filter Logic (Dual Visibility)
      const filtered = (users || []).filter((u: any) => {
        const uH = u.hierarchy || {};
        const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
        const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
        const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
        const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

        // Authority via Stable ID
        const matchesId = adminCounselorId && u.counselor_id === adminCounselorId;

        // Authority via Legacy Match
        const matchesEmail = bE === adminEmail || gE === adminEmail;
        const matchesName = adminCounselorName && (bN === adminCounselorName || gN === adminCounselorName);

        return matchesId || matchesEmail || matchesName;
      });

      setPendingUsers(filtered.map(mapUserData));
    } catch (error) {
      console.error('Error loading pending users:', error);
      toast.error('Failed to load pending devotees');
    } finally {
      setLoadingPending(false);
    }
  }, [userData?.email, userData?.id, hasCounselorRole, supabase]);

  const loadStats = useCallback(async () => {
    if (!userData?.email || !hasCounselorRole || !supabase) return;
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const adminEmail = userData.email.trim().toLowerCase();

      // 1. Fetch Students count and Counselor details in parallel
      const [studentsRes, counselorRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('counselor_id', userData.id),
        supabase.from('counselors').select('id, name').eq('email', adminEmail).maybeSingle()
      ]);

      const studentsCount = studentsRes.count || 0;
      const adminCounselorId = counselorRes.data?.id;
      const adminCounselorName = counselorRes.data?.name?.trim().toLowerCase();

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // 2. Fetch pending profile requests count via API for perfect parity
      let spiritualCount = 0;
      if (token) {
        const profileReqsResponse = await fetch(`/api/profile-requests?status=pending&_t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        const profileReqsJson = await profileReqsResponse.json();
        if (profileReqsJson.success) {
          spiritualCount = profileReqsJson.data.length;
        }
      }

      // 3. Get pending users count (Mirror loadPendingUsers logic)
      let regCount = 0;
      const { data: pendingUsersData } = await supabase
        .from('users')
        .select('id, counselor_id, hierarchy')
        .eq('verification_status', 'pending');

      if (pendingUsersData) {
        regCount = pendingUsersData.filter((u: any) => {
          const uH = u.hierarchy || {};
          const bE = (uH.brahmachariCounselorEmail || '').trim().toLowerCase();
          const gE = (uH.grihasthaCounselorEmail || '').trim().toLowerCase();
          const bN = (uH.brahmachariCounselor || '').trim().toLowerCase();
          const gN = (uH.grihasthaCounselor || '').trim().toLowerCase();

          const matchesId = adminCounselorId && u.counselor_id === adminCounselorId;
          const matchesEmail = bE === adminEmail || gE === adminEmail;
          const matchesName = adminCounselorName && (bN === adminCounselorName || gN === adminCounselorName);

          return matchesId || matchesEmail || matchesName;
        }).length;
      }

      setStats({
        devotees: studentsCount,
        pendingSpiritual: spiritualCount,
        pendingRegistrations: regCount,
        loading: false
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [userData?.email, userData?.id, hasCounselorRole, supabase]);

  // LOAD BASE DATA (Stats) ONCE
  useEffect(() => {
    if (userData && hasCounselorRole) {
      loadStats();
    } else if (!loading && !hasCounselorRole) {
      router.replace('/dashboard');
    }
  }, [userData, hasCounselorRole, loading, router, loadStats]);

  // LOAD TAB-SPECIFIC DATA
  useEffect(() => {
    if (userData && hasCounselorRole) {
      if (activeTab === 'sadhana-reports') loadStudents();
      if (activeTab === 'spiritual-approvals') loadProfileRequests();
      if (activeTab === 'new-dev-approvals') loadPendingUsers();
    }
  }, [activeTab, loadStudents, loadProfileRequests, loadPendingUsers, userData, hasCounselorRole]);

  // Approval Handlers
  const handleProfileApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsProcessing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const response = await fetch(`/api/profile-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: action,
          feedback: feedback,
          approvedFields: action === 'approved' ? selectedFields[requestId] : undefined
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`Request ${action} successfully`);
        setProfileRequests(prev => prev.filter(r => r.id !== requestId));
        setFeedback('');
        setExpandedRequestId(null);
        loadStats();
      } else {
        toast.error(json.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing profile request:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDevoteeApproval = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!supabase) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          verification_status: action === 'approve' ? 'approved' : 'rejected',
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userData?.id
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User ${action === 'approve' ? 'verified' : 'rejected'} successfully`);
      loadPendingUsers();
      loadStats();
    } catch (error) {
      console.error('Error processing devotee verification:', error);
      toast.error('Failed to update user status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkProfileApproval = async (action: 'approved' | 'rejected', reason?: string) => {
    if (selectedRequestIds.length === 0) return;
    setIsProcessing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const response = await fetch('/api/profile-requests/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestIds: selectedRequestIds,
          status: action,
          feedback: action === 'rejected' ? (feedback || 'Bulk rejection from counselor') : undefined
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`${selectedRequestIds.length} requests ${action} successfully`);
        setSelectedRequestIds([]);
        loadProfileRequests();
        loadStats();
      } else {
        toast.error(json.error || 'Failed to process bulk requests');
      }
    } catch (error) {
      console.error('Error in bulk profile approval:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDevoteeApproval = async (action: 'approve' | 'reject', reason?: string) => {
    if (selectedPendingUserIds.length === 0 || !supabase) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          verification_status: action === 'approve' ? 'approved' : 'rejected',
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userData?.id
        })
        .in('id', selectedPendingUserIds);

      if (error) throw error;

      toast.success(`${selectedPendingUserIds.length} users ${action === 'approve' ? 'verified' : 'rejected'} successfully`);
      setSelectedPendingUserIds([]);
      loadPendingUsers();
      loadStats();
    } catch (error) {
      console.error('Error in bulk devotee verification:', error);
      toast.error('Failed to process bulk registrations');
    } finally {
      setIsProcessing(false);
    }
  };


  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone && student.phone.includes(searchTerm));

      // Camp filter logic
      let matchesCamp = true;
      if (selectedCampFilter !== 'all') {
        switch (selectedCampFilter) {
          case 'DYS':
            matchesCamp = student.campDys === true;
            break;
          case 'Sankalpa':
            matchesCamp = student.campSankalpa === true;
            break;
          case 'Sphurti':
            matchesCamp = student.campSphurti === true;
            break;
          case 'Utkarsh':
            matchesCamp = student.campUtkarsh === true;
            break;
          case 'Faith and Doubt':
            matchesCamp = student.campFaithAndDoubt === true;
            break;
          case 'SRCGD Workshop':
            matchesCamp = student.campSrcgdWorkshop === true;
            break;
          case 'Nistha':
            matchesCamp = student.campNistha === true;
            break;
          case 'Ashray':
            matchesCamp = student.campAshray === true;
            break;
          default:
            matchesCamp = true;
        }
      }

      return matchesSearch && matchesCamp;
    });
  }, [students, searchTerm, selectedCampFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const confirmAction = async () => {
    if (confirmation.type) {
      if (confirmation.source === 'spiritual') {
        if (confirmation.mode === 'single' && confirmation.requestId) {
          await handleProfileApproval(confirmation.requestId, confirmation.type);
        } else if (confirmation.mode === 'bulk') {
          await handleBulkProfileApproval(confirmation.type, feedback);
        }
      } else if (confirmation.source === 'registration') {
        if (confirmation.mode === 'single' && confirmation.requestId) {
          await handleDevoteeApproval(confirmation.requestId, confirmation.type === 'approved' ? 'approve' : 'reject');
        } else if (confirmation.mode === 'bulk') {
          await handleBulkDevoteeApproval(confirmation.type === 'approved' ? 'approve' : 'reject');
        }
      }
      setConfirmation({ isOpen: false, type: null, count: 0, requestId: null, mode: 'single', source: 'spiritual' });
    }
  };

  const toggleSelectAllProfiles = () => {
    if (selectedRequestIds.length === profileRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(profileRequests.map(r => r.id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const renderFieldChange = (requestId: string, key: string, newValue: any, oldValue: any) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    // Normalize values for display
    const displayOld = (oldValue === null || oldValue === undefined || oldValue === '') ? 'Not Set' : oldValue.toString();
    const displayNew = (newValue === null || newValue === undefined || newValue === '') ? 'Cleared' : newValue.toString();

    // If both are functionally empty, skip
    if (displayOld === 'Not Set' && (displayNew === 'Cleared' || displayNew === '')) return null;
    if (displayOld === displayNew) return null;

    const isSelected = selectedFields[requestId]?.includes(key) ?? true;

    const toggleField = () => {
      setSelectedFields(prev => {
        const current = prev[requestId] || Object.keys(profileRequests.find(r => r.id === requestId)?.requested_changes || {});
        if (current.includes(key)) {
          return { ...prev, [requestId]: current.filter(k => k !== key) };
        } else {
          return { ...prev, [requestId]: [...current, key] };
        }
      });
    };

    return (
      <div
        key={key}
        className={`flex items-start gap-3 sm:gap-4 py-3 sm:py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors px-2 rounded-lg cursor-pointer ${!isSelected ? 'opacity-60 grayscale-[0.5]' : ''}`}
        onClick={approvalStatus === 'pending' ? toggleField : undefined}
      >
        {approvalStatus === 'pending' && (
          <div className="pt-4 sm:pt-5">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 ring-2 ring-amber-200 shadow-sm' : 'border-gray-300 bg-white'}`}>
              {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
            </div>
          </div>
        )}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label} (Current)</span>
            <div className="inline-flex">
              <span className="text-xs sm:text-sm text-gray-600 line-through decoration-red-300 opacity-70 bg-red-50/30 px-2 py-1 rounded truncate max-w-full">{displayOld}</span>
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-widest mb-1">{label} (Requested)</span>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded shadow-sm truncate max-w-full">{displayNew}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCampFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <p className="text-base sm:text-lg md:text-xl font-serif text-orange-700 font-semibold mb-2">
            Hare Krishna
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 bg-clip-text text-transparent mb-2 sm:mb-3 py-1">
            Counselor Dashboard
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
            Manage your connected students and approvals ({userData?.email})
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 sm:mb-8 max-w-5xl mx-auto">
          <div
            onClick={() => setActiveTab('sadhana-reports')}
            className={`cursor-pointer group transition-all transform hover:scale-[1.02] ${activeTab === 'sadhana-reports' ? 'ring-2 ring-orange-500 ring-offset-4 rounded-2xl' : ''}`}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-orange-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl transition-colors ${activeTab === 'sadhana-reports' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'}`}>
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sadhana Reports</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900 tracking-tight">{stats.loading ? '...' : stats.devotees}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase letter-spacing-widest">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('spiritual-approvals');
              setApprovalStatus('pending');
            }}
            className={`cursor-pointer group transition-all transform hover:scale-[1.02] ${activeTab === 'spiritual-approvals' ? 'ring-2 ring-amber-500 ring-offset-4 rounded-2xl' : ''}`}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-amber-100 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl transition-colors ${activeTab === 'spiritual-approvals' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'}`}>
                  <FileCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spiritual Pending</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900 tracking-tight">{stats.loading ? '...' : stats.pendingSpiritual}</span>
                    <span className="text-[10px] font-bold text-amber-600 uppercase letter-spacing-widest">Requests</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('new-dev-approvals')}
            className={`cursor-pointer group transition-all transform hover:scale-[1.02] ${activeTab === 'new-dev-approvals' ? 'ring-2 ring-emerald-500 ring-offset-4 rounded-2xl' : ''}`}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-emerald-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl transition-colors ${activeTab === 'new-dev-approvals' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Dev Pending</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900 tracking-tight">{stats.loading ? '...' : stats.pendingRegistrations}</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase letter-spacing-widest">New Reg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl w-fit border border-gray-200/50 shadow-sm mx-auto">
          <button
            onClick={() => setActiveTab('sadhana-reports')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'sadhana-reports'
              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
          >
            <TrendingUp className="h-4 w-4" />
            Sadhana Reports
          </button>
          <button
            onClick={() => setActiveTab('spiritual-approvals')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'spiritual-approvals'
              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
          >
            <FileCheck className="h-4 w-4" />
            Spiritual Approvals
          </button>
          <button
            onClick={() => setActiveTab('new-dev-approvals')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'new-dev-approvals'
              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
          >
            <ShieldCheck className="h-4 w-4" />
            New Dev Approvals
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === 'sadhana-reports' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Search and Filter */}
              <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white"
                  />
                </div>
                <div className="w-full md:w-72 relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={selectedCampFilter}
                    onChange={(e) => setSelectedCampFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white appearance-none"
                  >
                    <option value="all">All Camps</option>
                    <option value="DYS">DYS</option>
                    <option value="Sankalpa">Sankalpa</option>
                    <option value="Sphurti">Sphurti</option>
                    <option value="Utkarsh">Utkarsh</option>
                    <option value="Faith and Doubt">Faith and Doubt</option>
                    <option value="SRCGD Workshop">SRCGD Workshop</option>
                    <option value="Nistha">Nistha</option>
                    <option value="Ashray">Ashray</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white/50 rounded-2xl border border-white/20">
                  <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Loading your devotees...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-8 sm:p-12 text-center">
                  <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No devotees found matching your search.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Mobile View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4 sm:gap-6">
                      {paginatedStudents.map((student) => (
                        <div
                          key={student.id}
                          className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-5 hover:shadow-2xl transition-all transform hover:scale-[1.02] flex flex-col"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            {student.profileImage ? (
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-orange-200 flex-shrink-0">
                                <Image
                                  src={student.profileImage}
                                  alt={student.name}
                                  fill
                                  className="object-cover"
                                  unoptimized={true}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <UserCircle className="h-6 w-6 text-orange-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-800 truncate">
                                {student.name}
                              </h3>
                              <p className="text-[10px] text-gray-500 uppercase tracking-tighter mb-1">
                                {getRoleDisplayName(getHighestRole(student.role))}
                              </p>
                              {student.avgSoulPercent !== undefined && (
                                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${student.progressBgColor || ''} ${student.progressColor || ''} border border-black/10`}>
                                  <Sparkles className="h-2 w-2" />
                                  <span>{student.progressRating}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-[11px] mb-4 flex-1">
                            {student.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{student.email}</span>
                              </div>
                            )}
                            {student.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span>{student.phone}</span>
                              </div>
                            )}
                            {student.hierarchy?.center && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{student.hierarchy.center}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-orange-100 mt-auto">
                            <button
                              onClick={() => router.push(`/dashboard/sadhana/progress/${student.id}`)}
                              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all text-[11px] font-bold flex items-center justify-center gap-2"
                            >
                              <TrendingUp className="h-3 w-3" />
                              Progress
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block bg-white rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/50 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Devotee</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Sadhana Progress</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Hierarchy</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {paginatedStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-orange-50/30 transition-all duration-300 group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {student.profileImage ? (
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-orange-100">
                                      <Image src={student.profileImage} alt={student.name} fill className="object-cover" unoptimized />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                                      <UserCircle className="h-5 w-5 text-orange-400" />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900 tracking-tight">{student.name}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                      {getRoleDisplayName(getHighestRole(student.role))}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span>{student.email || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span>{student.phone || 'N/A'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {student.avgSoulPercent !== undefined && (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                                        <div
                                          className={`h-full transition-all duration-500 ${student.progressColor?.replace('text-', 'bg-') || 'bg-gray-400'}`}
                                          style={{ width: `${student.avgSoulPercent}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-black text-gray-700">{Math.round(student.avgSoulPercent)}%</span>
                                    </div>
                                    <div className={`inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded text-[9px] font-black ${student.progressBgColor || ''} ${student.progressColor || ''} border border-black/5`}>
                                      <Sparkles className="h-2 w-2" />
                                      <span>{student.progressRating}</span>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-gray-500 tracking-tight">{student.hierarchy?.center || 'N/A'}</span>
                                  <span className="text-[10px] font-bold text-orange-600 tracking-tight italic">{student.hierarchy?.temple || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => router.push(`/dashboard/sadhana/progress/${student.id}`)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-sm shadow-orange-100"
                                >
                                  <TrendingUp className="h-3 w-3" />
                                  Progress
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-orange-200 rounded-lg disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-bold text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-orange-200 rounded-lg disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === 'spiritual-approvals' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100/50 rounded-lg">
                    <FileCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Spiritual Update Requests</h2>
                </div>

                <div className="flex items-center gap-4">
                  {(['pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setApprovalStatus(status);
                        setSelectedRequestIds([]);
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalStatus === status
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {selectedRequestIds.length > 0 && approvalStatus === 'pending' && (
                  <div className="flex items-center justify-between gap-4 bg-amber-600 p-2 pl-4 sm:pl-6 rounded-xl shadow-lg shadow-amber-200 animate-in zoom-in-95 duration-300">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedRequestIds.length} Selected</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setConfirmation({
                            isOpen: true,
                            type: 'rejected',
                            count: selectedRequestIds.length,
                            mode: 'bulk',
                            source: 'spiritual'
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setConfirmation({
                            isOpen: true,
                            type: 'approved',
                            count: selectedRequestIds.length,
                            mode: 'bulk',
                            source: 'spiritual'
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-white text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingRequests ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                  <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving spiritual requests...</p>
                </div>
              ) : profileRequests.length === 0 ? (
                <div className="text-center py-24 bg-white/50 rounded-[2rem] border border-dashed border-gray-200">
                  <div className="bg-amber-50 h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileCheck className="h-10 w-10 text-amber-200" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">No {approvalStatus} requests</h3>
                  <p className="text-gray-500 font-medium max-w-xs mx-auto mt-2 text-sm">Everything is processed for your students spiritual updates.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {approvalStatus === 'pending' && profileRequests.length > 0 && (
                    <div className="flex items-center gap-4 px-8 py-4 bg-[#fffdfa]/90 backdrop-blur-md rounded-2xl border border-amber-200 shadow-xl shadow-orange-100/40">
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedRequestIds.length === profileRequests.length && profileRequests.length > 0 ? 'bg-primary-600 border-primary-600 shadow-lg' : 'border-gray-200 hover:border-primary-400'}`}
                        onClick={toggleSelectAllProfiles}
                      >
                        {selectedRequestIds.length === profileRequests.length && profileRequests.length > 0 && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                      </div>
                      <span className="text-xs font-black text-gray-600 uppercase tracking-widest">
                        {selectedRequestIds.length === 0 ? 'Select All Requests' : `Batch Management (${selectedRequestIds.length})`}
                      </span>
                    </div>
                  )}

                  {profileRequests.map(request => {
                    const isExpanded = expandedRequestId === request.id;
                    const changeCount = Object.keys(request.requested_changes).length;

                    return (
                      <div key={request.id} className={`group bg-[#fffdfa]/90 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-primary-300 shadow-2xl shadow-primary-100 ring-4 ring-primary-500/10' : 'border-amber-200 shadow-xl shadow-orange-100/30 hover:border-amber-300'}`}>
                        <div
                          className={`p-5 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/30' : 'hover:bg-primary-50/20'}`}
                          onClick={() => setExpandedRequestId(isExpanded ? null : request.id)}
                        >
                          <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto">
                            {approvalStatus === 'pending' && (
                              <div
                                className="flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); toggleSelection(request.id); }}
                              >
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${selectedRequestIds.includes(request.id) ? 'bg-primary-600 border-primary-600 shadow-lg shadow-primary-200 rotate-0' : 'border-gray-200 hover:border-primary-400 bg-white rotate-12 hover:rotate-0'}`}>
                                  {selectedRequestIds.includes(request.id) && <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white stroke-[3px]" />}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                              <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.25rem] shadow-inner flex-shrink-0 ${request.status === 'pending' ? 'bg-amber-100 text-amber-600' : request.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {request.status === 'pending' ? <Clock className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" /> : request.status === 'approved' ? <Check className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" /> : <X className="h-4 w-4 sm:h-6 sm:w-6 stroke-[2.5px]" />}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight group-hover:text-primary-600 transition-colors uppercase truncate">{request.user?.name || 'Unknown Identity'}</h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                  <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" /> {new Date(request.created_at).toLocaleDateString()}
                                  </p>
                                  <div className="hidden xs:block h-1 w-1 rounded-full bg-gray-300" />
                                  <p className="text-[9px] sm:text-[10px] font-black text-primary-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
                                    <Mail className="h-3 w-3" /> {request.user?.email || 'OFFLINE'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-gray-100 md:border-0 pt-4 md:pt-0">
                            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100/80 rounded-xl border border-gray-200/50">
                              <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                                <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
                                {changeCount} Delta{changeCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all ${isExpanded ? 'bg-primary-600 border-primary-600 text-white rotate-180 shadow-lg shadow-primary-200' : 'bg-white border-gray-100 text-gray-400 group-hover:border-primary-200 group-hover:text-primary-500'}`}>
                              <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                          </div>
                        </div>


                        {
                          isExpanded && (
                            <div className="p-5 sm:p-10 bg-gradient-to-b from-primary-50/30 to-white border-t border-primary-100 animate-in slide-in-from-top-4 duration-500">
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                <div>
                                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <History className="h-4 w-4 text-primary-500" /> Modification Audit
                                  </h4>
                                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Review proposed schema changes for this security identity</p>
                                </div>
                                {approvalStatus === 'pending' && (
                                  <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
                                    <button
                                      onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: [] }))}
                                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
                                    >
                                      Reject All
                                    </button>
                                    <button
                                      onClick={() => setSelectedFields(prev => ({ ...prev, [request.id]: Object.keys(request.requested_changes) }))}
                                      className="px-4 py-2 bg-white text-[10px] font-black uppercase tracking-widest text-primary-600 rounded-lg shadow-sm hover:shadow-md transition-all"
                                    >
                                      Sync All
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 gap-3 mb-10">
                                {Object.keys(request.requested_changes).map(key =>
                                  renderFieldChange(request.id, key, request.requested_changes[key], request.current_values[key])
                                )}
                              </div>

                              {request.status === 'pending' ? (
                                <div className="bg-white/60 backdrop-blur-md p-8 rounded-[2rem] border border-white shadow-2xl shadow-gray-200/50 space-y-8">
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Administrative Feedback & Rationale</label>
                                    <textarea
                                      className="w-full px-6 py-5 bg-gray-50/50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary-100 focus:ring-4 focus:ring-primary-500/5 outline-none font-medium transition-all shadow-inner resize-none text-gray-700"
                                      rows={3}
                                      placeholder="Specify requirements for rejection or notes for approval..."
                                      value={feedback}
                                      onChange={(e) => setFeedback(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex flex-col sm:flex-row justify-end gap-4">
                                    <button
                                      onClick={() => {
                                        setConfirmation({
                                          isOpen: true,
                                          type: 'rejected',
                                          count: 1,
                                          requestId: request.id,
                                          mode: 'single',
                                          source: 'spiritual'
                                        });
                                      }}
                                      disabled={!feedback.trim()}
                                      className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 group/btn ${!feedback.trim() ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' : 'bg-white text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white hover:shadow-xl hover:shadow-rose-100'}`}
                                    >
                                      <X className="h-4 w-4 stroke-[3px] group-hover/btn:scale-110 transition-transform" /> Reject Delta
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmation({
                                          isOpen: true,
                                          type: 'approved',
                                          count: 1,
                                          requestId: request.id,
                                          mode: 'single',
                                          source: 'spiritual'
                                        });
                                      }}
                                      disabled={selectedFields[request.id] && selectedFields[request.id].length === 0}
                                      className="px-8 py-4 bg-gradient-to-r from-primary-600 to-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-200 hover:shadow-2xl hover:scale-[1.02] transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                    >
                                      <Check className="h-4 w-4 stroke-[3px]" />
                                      {selectedFields[request.id]?.length === changeCount || !selectedFields[request.id]
                                        ? 'Approve Full Identity'
                                        : `Authorize ${selectedFields[request.id]?.length} Deltas`}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-[#fffdfa]/80 backdrop-blur-md p-8 rounded-[2rem] border border-amber-200 shadow-xl shadow-orange-100/40 group/status">
                                  <div className="flex items-center gap-3 mb-6">
                                    <div className={`p-2 rounded-lg ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                      <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Lifecycle Resolution</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${request.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                      <p className="text-2xl font-black text-gray-900 tracking-tight uppercase">{request.status}</p>
                                    </div>
                                  </div>
                                  {request.admin_feedback && (
                                    <div className="mt-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 italic text-sm text-gray-500 font-medium relative">
                                      <span className="relative z-10">&quot;{request.admin_feedback}&quot;</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new-dev-approvals' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100/50 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">New Devotee Registrations</h2>
                </div>

                {selectedPendingUserIds.length > 0 && (
                  <div className="flex items-center justify-between gap-4 bg-emerald-600 p-2 pl-4 sm:pl-6 rounded-xl shadow-lg shadow-emerald-200 animate-in zoom-in-95 duration-300">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">{selectedPendingUserIds.length} Selected</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setConfirmation({
                            isOpen: true,
                            type: 'rejected',
                            count: selectedPendingUserIds.length,
                            mode: 'bulk',
                            source: 'registration'
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setConfirmation({
                            isOpen: true,
                            type: 'approved',
                            count: selectedPendingUserIds.length,
                            mode: 'bulk',
                            source: 'registration'
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-white text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingPending ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                  <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
                  <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">Retrieving registrations...</p>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-24 bg-white/50 rounded-[2rem] border border-dashed border-gray-200">
                  <div className="bg-emerald-50 h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="h-10 w-10 text-emerald-200" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">All clear!</h3>
                  <p className="text-gray-500 font-medium max-w-xs mx-auto mt-2 text-sm">No pending registrations for your students at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile View */}
                  <div className="lg:hidden space-y-4">
                    {pendingUsers.map((pUser) => (
                      <div key={pUser.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPendingUserIds.includes(pUser.id)}
                            onChange={() => {
                              setSelectedPendingUserIds(prev =>
                                prev.includes(pUser.id) ? prev.filter(id => id !== pUser.id) : [...prev, pUser.id]
                              );
                            }}
                            className="w-5 h-5 rounded-md border-orange-200 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserCircle className="h-7 w-7 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-gray-900 truncate">{pUser.name}</h4>
                            <p className="text-xs text-gray-400 truncate">{pUser.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-gray-100">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Temple & Center</p>
                            <p className="text-[11px] font-bold text-gray-700 truncate">{pUser.current_temple || pUser.hierarchy?.currentTemple || 'N/A'}</p>
                            <p className="text-[10px] text-emerald-600 truncate">{pUser.current_center || pUser.hierarchy?.currentCenter || 'N/A'}</p>
                          </div>
                          <div className="p-2 bg-gray-50 rounded-lg text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-right">Counselor & Ashram</p>
                            <span className="text-[10px] font-black text-amber-600 tracking-tight">{pUser.counselor?.name || pUser.counselor_name || pUser.hierarchy?.counselor || 'N/A'}</span>
                            <p className="text-[10px] text-gray-500 truncate">{pUser.hierarchy?.ashram || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setConfirmation({
                                isOpen: true,
                                type: 'rejected',
                                count: 1,
                                requestId: pUser.id,
                                mode: 'single',
                                source: 'registration'
                              });
                            }}
                            className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest border border-rose-100"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setConfirmation({
                                isOpen: true,
                                type: 'approved',
                                count: 1,
                                requestId: pUser.id,
                                mode: 'single',
                                source: 'registration'
                              });
                            }}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block bg-white rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/50 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left">
                            <input
                              type="checkbox"
                              checked={selectedPendingUserIds.length === pendingUsers.length && pendingUsers.length > 0}
                              onChange={() => {
                                if (selectedPendingUserIds.length === pendingUsers.length) setSelectedPendingUserIds([]);
                                else setSelectedPendingUserIds(pendingUsers.map(u => u.id));
                              }}
                              className="w-4 h-4 rounded-md border-orange-200 text-emerald-600 focus:ring-emerald-500"
                            />
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Devotee Details</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Temple & Center</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Counselor & Ashram</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pendingUsers.map((pUser) => (
                          <tr key={pUser.id} className="hover:bg-emerald-50/30 transition-all duration-300 group">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedPendingUserIds.includes(pUser.id)}
                                onChange={() => {
                                  setSelectedPendingUserIds(prev =>
                                    prev.includes(pUser.id) ? prev.filter(id => id !== pUser.id) : [...prev, pUser.id]
                                  );
                                }}
                                className="w-4 h-4 rounded-md border-orange-200 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-900 tracking-tight">{pUser.name}</span>
                                <span className="text-xs font-bold text-gray-400">{pUser.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-gray-500 tracking-tight">{pUser.current_temple || pUser.hierarchy?.currentTemple || 'N/A'}</span>
                                <span className="text-[10px] font-bold text-emerald-600 tracking-tight italic">{pUser.current_center || pUser.hierarchy?.currentCenter || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-amber-600 tracking-tight">{pUser.counselor?.name || pUser.counselor_name || pUser.hierarchy?.counselor || 'N/A'}</span>
                                <span className="text-[10px] font-bold text-gray-500 tracking-tight italic">{pUser.hierarchy?.ashram || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                                <button
                                  onClick={() => {
                                    setConfirmation({
                                      isOpen: true,
                                      type: 'rejected',
                                      count: 1,
                                      requestId: pUser.id,
                                      mode: 'single',
                                      source: 'registration'
                                    });
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black transition-all active:scale-95 border border-rose-100"
                                >
                                  <X className="h-3 w-3" />
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmation({
                                      isOpen: true,
                                      type: 'approved',
                                      count: 1,
                                      requestId: pUser.id,
                                      mode: 'single',
                                      source: 'registration'
                                    });
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black transition-all active:scale-95 border border-emerald-100"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modal (Approvals) - MD Style */}
        {confirmation.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-white/20 animate-in zoom-in-95 duration-300">
              <div className={`p-8 ${confirmation.type === 'approved' ? 'bg-gradient-to-br from-emerald-50 to-teal-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`p-4 rounded-2xl ${confirmation.type === 'approved' ? 'bg-white text-emerald-600 shadow-emerald-100' : 'bg-white text-red-600 shadow-red-100'} shadow-xl`}>
                    {confirmation.type === 'approved' ? <Check className="h-8 w-8 stroke-[2.5px]" /> : <AlertCircle className="h-8 w-8 stroke-[2.5px]" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                      {confirmation.type === 'approved' ? 'Approve Updates?' : 'Reject Updates?'}
                    </h3>
                    <p className="text-gray-500 font-medium mt-1">
                      You are about to {confirmation.type} <span className="text-gray-900 font-bold underline decoration-2 decoration-orange-400">{confirmation.count}</span> {confirmation.source === 'registration' ? (confirmation.count === 1 ? 'user registration' : 'user registrations') : (confirmation.count === 1 ? 'spiritual request' : 'spiritual requests')}.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-white space-y-4">
                {confirmation.type === 'rejected' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                    <textarea
                      className="w-full px-4 py-3 text-sm bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-red-400 focus:bg-white outline-none transition-all resize-none"
                      rows={3}
                      placeholder="Please provide constructive feedback..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (confirmation.source === 'registration') {
                        if (confirmation.mode === 'single' && confirmation.requestId) {
                          handleDevoteeApproval(confirmation.requestId, confirmation.type === 'approved' ? 'approve' : 'reject', rejectionReason);
                        } else {
                          handleBulkDevoteeApproval(confirmation.type === 'approved' ? 'approve' : 'reject', rejectionReason);
                        }
                      } else {
                        if (confirmation.mode === 'single' && confirmation.requestId) {
                          handleProfileApproval(confirmation.requestId, confirmation.type === 'approved' ? 'approved' : 'rejected');
                        } else {
                          handleBulkProfileApproval(confirmation.type === 'approved' ? 'approved' : 'rejected', rejectionReason);
                        }
                      }
                      setConfirmation({ ...confirmation, isOpen: false });
                      setRejectionReason('');
                    }}
                    disabled={confirmation.type === 'rejected' && !rejectionReason.trim()}
                    className={`w-full py-4 text-sm font-black text-white rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale ${confirmation.type === 'approved'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 shadow-emerald-200'
                      : 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 shadow-red-200'
                      }`}
                  >
                    {confirmation.type === 'approved' ? 'CONFIRM APPROVAL' : 'CONFIRM REJECTION'}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmation({ ...confirmation, isOpen: false });
                      setRejectionReason('');
                    }}
                    className="w-full py-4 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
