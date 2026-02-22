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
  TrendingUp, Sparkles, ChevronLeft, ChevronRight, FileCheck,
  Check, X, AlertCircle, Calendar, ShieldCheck, Search, Filter,
  Clock, Award, History, ArrowRight
} from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/roles';
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
  const [activeTab, setActiveTab] = useState<'devotees' | 'spiritual-approvals' | 'new-dev-approvals' | 'sadhana-reports'>('devotees');
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

      const response = await fetch(`/api/profile-requests?status=${approvalStatus}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
    if (!userData?.email || !hasCounselorRole) return;
    setLoadingPending(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/admin/users/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        setPendingUsers(json.data);
      }
    } catch (error) {
      console.error('Error loading pending users:', error);
      toast.error('Failed to load pending devotees');
    } finally {
      setLoadingPending(false);
    }
  }, [userData?.email, hasCounselorRole]);

  useEffect(() => {
    if (userData && hasCounselorRole) {
      if (activeTab === 'devotees') loadStudents();
      if (activeTab === 'spiritual-approvals') loadProfileRequests();
      if (activeTab === 'new-dev-approvals') loadPendingUsers();
    } else if (!loading && !hasCounselorRole) {
      router.replace('/dashboard');
    }
  }, [userData, hasCounselorRole, activeTab, loadStudents, loadProfileRequests, loadPendingUsers, loading, router]);

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
        body: JSON.stringify({ status: action })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`Request ${action} successfully`);
        loadProfileRequests();
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

  const handleDevoteeApproval = async (userId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;

      const response = await fetch('/api/admin/verify-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'user',
          id: userId,
          action
        })
      });

      const json = await response.json();
      if (json.success) {
        toast.success(`User ${action === 'approve' ? 'verified' : 'rejected'} successfully`);
        loadPendingUsers();
      } else {
        toast.error(json.error || 'Failed to process verification');
      }
    } catch (error) {
      console.error('Error processing devotee verification:', error);
      toast.error('Internal server error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!loading && !hasCounselorRole) {
    return null;
  }

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCampFilter]);

  if (!hasCounselorRole) {
    return null;
  }

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

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl w-fit border border-gray-200/50 shadow-sm mx-auto">
          <button
            onClick={() => setActiveTab('devotees')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 min-w-max ${activeTab === 'devotees'
              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
          >
            <Users className="h-4 w-4" />
            My Devotees
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
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === 'devotees' && (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                              {getRoleDisplayName(Array.isArray(student.role) ? student.role[0] : (student.role || 'student'))}
                            </p>
                            {student.avgSoulPercent !== undefined && (
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${student.progressBgColor} ${student.progressColor} border border-black/10`}>
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
                            onClick={() => router.push(`/dashboard/progress/${student.id}`)}
                            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all text-[11px] font-bold flex items-center justify-center gap-2"
                          >
                            <TrendingUp className="h-3 w-3" />
                            Progress
                          </button>
                        </div>
                      </div>
                    ))}
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
              <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex gap-2">
                  {(['pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setApprovalStatus(status)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalStatus === status
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {loadingRequests ? (
                <div className="flex flex-col items-center justify-center p-20">
                  <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Loading spiritual requests...</p>
                </div>
              ) : profileRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                  <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No {approvalStatus} spiritual requests found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {profileRequests.map((req) => (
                    <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center">
                            <UserCircle className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{req.user?.name}</h3>
                            <p className="text-xs text-gray-500">{req.user?.email}</p>
                          </div>
                        </div>

                        <div className="flex-1 lg:px-6">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(req.requested_changes).map(([key, value]) => (
                              <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold">
                                <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                <span className="text-orange-600">{String(value)}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {approvalStatus === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleProfileApproval(req.id, 'approved')}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => handleProfileApproval(req.id, 'rejected')}
                              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        )}

                        {approvalStatus !== 'pending' && (
                          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {approvalStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new-dev-approvals' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loadingPending ? (
                <div className="flex flex-col items-center justify-center p-20">
                  <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Loading pending registrations...</p>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending registrations found for your students.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingUsers.map((pUser) => (
                    <div key={pUser.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
                          <UserCircle className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{pUser.name}</h3>
                          <p className="text-xs text-gray-500">{pUser.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] mb-5">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-gray-400 font-bold uppercase text-[9px]">City</p>
                          <p className="text-gray-700 font-bold">{pUser.current_city || 'Not set'}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-gray-400 font-bold uppercase text-[9px]">Center</p>
                          <p className="text-gray-700 font-bold truncate">{pUser.current_center || 'Not set'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleDevoteeApproval(pUser.id, 'approve')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                        >
                          <Check className="h-4 w-4" />
                          Verify
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleDevoteeApproval(pUser.id, 'reject')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sadhana-reports' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl border border-orange-200 p-8 text-center shadow-lg">
                <TrendingUp className="h-16 w-16 text-orange-200 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sadhana Reports View</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  You can view the detailed sadhana reports of each devotee by clicking the
                  <strong className="text-orange-600 mx-1">Progress</strong> button on their card in the Devotees tab.
                </p>
                <button
                  onClick={() => setActiveTab('devotees')}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Go to Devotees Tab
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
