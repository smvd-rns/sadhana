'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByCounselorEmail } from '@/lib/supabase/counselors';
import { fetchSadhanaHistory } from '@/lib/api/sadhana-client';
import { User, SadhanaReport } from '@/types';
import { Users, Loader2, Mail, Phone, MapPin, Building2, UserCircle, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/utils/roles';

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
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampFilter, setSelectedCampFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check if user has counselor role
  const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
  const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2) ||
    userRoles.includes('senior_counselor') || userRoles.includes(3);

  useEffect(() => {
    if (!userData) return;

    // Check if user has counselor role or if their email is in counselor table
    if (!hasCounselorRole) {
      // Check if they can request counselor role
      router.push('/dashboard/counselor-request');
      return;
    }

    loadStudents();
  }, [userData, hasCounselorRole, router]);

  const loadStudents = async () => {
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
            My Students
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium">
            View and manage students assigned to your counselor email ({userData?.email})
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-3 sm:p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white"
            />
          </div>
          <div className="w-full md:w-72">
            <select
              value={selectedCampFilter}
              onChange={(e) => setSelectedCampFilter(e.target.value)}
              className="w-full px-4 py-2 sm:py-3 border-2 border-orange-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-white"
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

        {/* Filter Summary - Show when camp filter is active */}
        {(selectedCampFilter !== 'all' || searchTerm) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-semibold text-blue-800">
                  Filter Summary
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                <span className="font-medium text-blue-700">
                  Total Matching Students:
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                  {filteredStudents.length}
                </span>
              </div>

              {selectedCampFilter !== 'all' && (
                <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <span className="font-medium text-blue-700">
                    Selected Camp:
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                    {selectedCampFilter}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 max-w-md w-full p-10 text-center transform transition-all">
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 border-x-transparent mx-auto shadow-lg"></div>
              </div>
              <h2 className="text-3xl font-display font-bold mb-4 text-orange-700 tracking-wide">
                Hare Krishna
              </h2>
              <div className="space-y-2">
                <p className="text-xl text-gray-800 font-serif">
                  Loading students...
                </p>
              </div>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-8 sm:p-12 text-center">
            <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">
              {searchTerm || selectedCampFilter !== 'all'
                ? 'No students found matching your filters'
                : 'No students assigned to you yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6 hover:shadow-2xl transition-all transform hover:scale-[1.02]"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    {student.profileImage ? (
                      <img
                        src={student.profileImage}
                        alt={student.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-orange-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <UserCircle className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate mb-1">
                        {student.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mb-2">
                        {getRoleDisplayName(Array.isArray(student.role) ? student.role[0] : (student.role || 'student'))}
                      </p>
                      {/* Spiritual Progress Badge */}
                      {student.avgSoulPercent !== undefined && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${student.progressBgColor} ${student.progressColor} border-2 border-orange-200`}>
                          <Sparkles className="h-3 w-3" />
                          <span>{student.progressRating}</span>
                          {student.avgSoulPercent > 0 && (
                            <span className="ml-1">({student.avgSoulPercent.toFixed(1)}%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Spiritual Progress Bar */}
                  {student.avgSoulPercent !== undefined && student.avgSoulPercent > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700">Soul Progress</span>
                        <span className="text-xs sm:text-sm font-bold text-orange-700">{student.avgSoulPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-orange-100 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${student.avgSoulPercent >= 80
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : student.avgSoulPercent >= 50
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                              : 'bg-gradient-to-r from-orange-500 to-orange-600'
                            }`}
                          style={{ width: `${Math.min(100, Math.max(0, student.avgSoulPercent))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-xs sm:text-sm mb-4">
                    {student.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span>{student.phone}</span>
                      </div>
                    )}
                    {student.hierarchy?.city && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {student.hierarchy.city}
                          {student.hierarchy.state && (
                            <span className="text-gray-400">, {student.hierarchy.state}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {student.hierarchy?.center && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{student.hierarchy.center}</span>
                      </div>
                    )}
                    {student.totalReports !== undefined && student.totalReports > 0 && (
                      <div className="flex items-center gap-2 text-gray-600 pt-1 border-t border-gray-200">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-xs">{student.totalReports} report{student.totalReports !== 1 ? 's' : ''} (last 30 days)</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <button
                      onClick={() => router.push(`/dashboard/progress/${student.id}`)}
                      className="w-full px-4 py-2 sm:py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg sm:rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
                    >
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      View Progress Report
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold">{Math.min(endIndex, filteredStudents.length)}</span> of{' '}
                    <span className="font-semibold">{filteredStudents.length}</span> students
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, index, array) => {
                          const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsisBefore && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-orange-600 text-white'
                                    : 'border border-orange-200 hover:bg-orange-50 text-gray-700'
                                  }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {!loading && students.length > 0 && (
              <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                  <p className="text-sm sm:text-base text-gray-700 font-semibold">
                    <strong className="text-orange-700">Total Students:</strong> {students.length}
                    {(searchTerm || selectedCampFilter !== 'all') && (
                      <span className="ml-2 text-gray-600">
                        (Showing {filteredStudents.length} matching result{filteredStudents.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">Excellent (≥80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-gray-700">Good (≥50%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-gray-700">Needs Improvement</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
