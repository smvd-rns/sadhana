'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { logout } from '@/lib/supabase/auth';
import { getRoleDisplayName, getHighestRole } from '@/lib/utils/roles';
import { Menu, X, Home, BookOpen, MessageSquare, BarChart3, Users, Settings, LogOut, Upload, Building2, MapPin, UserCheck, CheckCircle2, UserCircle, Briefcase, Mic, Globe, Radio } from 'lucide-react';
import ProfileCompletionModal from '@/components/auth/ProfileCompletionModal';
import ProfileCreationLoadingModal from '@/components/auth/ProfileCreationLoadingModal';
import { getSmallThumbnailUrl } from '@/lib/utils/google-drive';
import { requestNotificationPermission, getNotificationPermission, isNotificationSupported } from '@/lib/utils/notifications';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { Bell, X as CloseIcon } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isCounselorEmail, setIsCounselorEmail] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  // Enable message notifications
  useMessageNotifications();

  // Check if profile is incomplete - use new required fields
  // Required fields: state, city, center, initiationStatus, ashram, brahmachariCounselor
  const isProfileComplete = userData?.hierarchy?.state &&
    userData?.hierarchy?.city &&
    userData?.hierarchy?.center &&
    userData?.hierarchy?.initiationStatus &&
    userData?.hierarchy?.ashram &&
    userData?.hierarchy?.brahmachariCounselor;

  const showLoadingModal = !loading && user && !userData;

  // Disable the profile completion modal - we use the complete-profile page instead
  useEffect(() => {
    setShowProfileModal(false);

    // If profile is incomplete and user is authenticated, redirect to complete-profile page
    // This is handled by the callback page, but we can add a check here as a fallback
    if (!loading && user && userData && !isProfileComplete) {
      // Don't redirect here - let the callback page handle it
      // Just ensure the modal doesn't show
    }
  }, [userData, loading, user, isProfileComplete]);

  // Check if user's email is in counselor table
  useEffect(() => {
    const checkCounselorEmail = async () => {
      if (!userData?.email) return;

      try {
        const { checkIfEmailIsCounselor } = await import('@/lib/supabase/counselor-requests');
        const isCounselor = await checkIfEmailIsCounselor(userData.email);
        setIsCounselorEmail(isCounselor);
      } catch (error) {
        console.error('Error checking counselor email:', error);
      }
    };

    if (userData) {
      checkCounselorEmail();
    }
  }, [userData]);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!userData?.id) return;

      try {
        const { getUserMessages } = await import('@/lib/supabase/messages');
        const messages = await getUserMessages(userData.id);
        const unread = messages.filter(msg => !msg.readBy.includes(userData.id));
        setUnreadCount(unread.length);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userData?.id]);

  // Check notification permission on mount
  useEffect(() => {
    if (isNotificationSupported() && getNotificationPermission() === 'default') {
      // Show banner to request permission after 3 seconds
      const timer = setTimeout(() => {
        setShowNotificationBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowNotificationBanner(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Force a full page reload to ensure all auth state is cleared and prevent
      // the login page from redirecting back to dashboard due to stale state
      window.location.href = '/auth/login';
    }
  };

  // Compute navigation based on user roles (using useMemo to avoid render-time mutations)
  const navigation = useMemo(() => {
    const userRoles = userData?.role ? (Array.isArray(userData.role) ? userData.role : [userData.role]) : [];
    const hasStudentOnly = userRoles.length === 1 && userRoles[0] === 'student';
    const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes(8 as any);

    // Check if user has counselor role
    const hasCounselorRole = userRoles.includes('counselor') || userRoles.includes(2);

    // Check if user has voice_manager role (role 3)
    const hasVoiceManagerRole = userRoles.includes('voice_manager') || userRoles.includes('senior_counselor') || userRoles.includes(3);

    // Check if user has bc_voice_manager role (role 4)
    const hasBCVoiceManagerRole = userRoles.includes('bc_voice_manager') || userRoles.includes(4);

    // Check if user has city_admin role (role 5)
    const hasCityAdminRole = userRoles.includes('city_admin') || userRoles.includes(5);

    // Check if user has state_admin role (role 6)
    const hasStateAdminRole = userRoles.includes('state_admin') || userRoles.includes(6);

    // Check if user has zonal_admin role (role 7)
    const hasZonalAdminRole = userRoles.includes('zonal_admin') || userRoles.includes(7);

    // Check if user has any admin role
    const isAdmin = userRoles.some(role =>
      (typeof role === 'string' && ['super_admin', 'zonal_admin', 'state_admin', 'city_admin', 'center_admin', 'bc_voice_manager'].includes(role)) ||
      (typeof role === 'number' && role >= 4 && role <= 8)
    );

    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Sadhana', href: '/dashboard/sadhana', icon: BookOpen },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'Progress', href: '/dashboard/progress', icon: BarChart3 },
      { name: 'Profile', href: '/dashboard/profile', icon: Settings },
    ];

    // Only role 8 (super_admin) and role 4 (bc_voice_manager) can see Users link
    if (isSuperAdmin || hasBCVoiceManagerRole) {
      baseNavigation.push({ name: 'Users', href: '/dashboard/users', icon: Users });
    }

    // Add Voice Manager page if user has voice_manager role (role 3)
    if (hasVoiceManagerRole) {
      baseNavigation.push({ name: 'Voice Manager', href: '/dashboard/voice-manager', icon: Mic });
    }

    // Add counselor page if user has counselor role
    if (hasCounselorRole) {
      baseNavigation.push({ name: 'Counselor', href: '/dashboard/counselor', icon: UserCheck });
    }

    // Add counselor request page if user's email is in counselor table but doesn't have counselor role
    if (isCounselorEmail && !hasCounselorRole) {
      baseNavigation.push({ name: 'Counselor', href: '/dashboard/counselor-request', icon: UserCircle });
    }

    // Add BC Voice Manager request page - only visible to role 2 (counselor)
    if (hasCounselorRole && !hasBCVoiceManagerRole) {
      baseNavigation.push({ name: 'BC Voice Manager', href: '/dashboard/bc-voice-manager-request', icon: Briefcase });
    } else if (hasCounselorRole && hasBCVoiceManagerRole) {
      // Add BC Voice Manager dashboard page if user has the role and is counselor
      baseNavigation.push({ name: 'BC Voice Manager', href: '/dashboard/bc-voice-manager', icon: Briefcase });
    }

    // Add City Manager page if user has city_admin role (role 5)
    if (hasCityAdminRole) {
      baseNavigation.push({ name: 'City Manager', href: '/dashboard/city-manager', icon: Building2 });
    }

    // Add State Manager page if user has state_admin role (role 6)
    if (hasStateAdminRole) {
      baseNavigation.push({ name: 'State Manager', href: '/dashboard/state-manager', icon: MapPin });
    }

    // Add Zone Manager page if user has zonal_admin role (role 7)
    if (hasZonalAdminRole) {
      baseNavigation.push({ name: 'Zone Manager', href: '/dashboard/zone-manager', icon: Globe });
    }

    // Broadcast access for all admins (Role 4+)
    if (isAdmin) {
      baseNavigation.push({ name: 'Broadcast', href: '/dashboard/broadcast', icon: Radio });
      baseNavigation.push({ name: 'Sent Messages', href: '/dashboard/broadcast/sent', icon: MessageSquare });
    }

    if (isSuperAdmin) {
      baseNavigation.push({ name: 'Import', href: '/dashboard/import', icon: Upload });
      baseNavigation.push({ name: 'Request Approval', href: '/dashboard/request-approval', icon: CheckCircle2 });
      baseNavigation.push({ name: 'Centers', href: '/dashboard/centers', icon: Building2 });
      baseNavigation.push({ name: 'Cities', href: '/dashboard/cities', icon: MapPin });
    }

    return baseNavigation;
  }, [userData?.role, isCounselorEmail, userData]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Profile Creation Loading Modal */}
      <ProfileCreationLoadingModal isOpen={!!showLoadingModal} />

      {/* Profile Completion Modal */}
      {showProfileModal && !isProfileComplete && !showLoadingModal && (
        <ProfileCompletionModal
          isOpen={showProfileModal}
          onComplete={() => {
            setShowProfileModal(false);
            // The modal will reload the page after completion
          }}
        />
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-to-b from-white via-orange-50 to-amber-50 shadow-xl border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Decorative background gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-100/40 via-amber-100/30 to-yellow-100/20 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>

          {/* Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200/60 flex-shrink-0 relative z-10 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent font-display tracking-tight">
                ISKCON Platform
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4 relative z-10">
            <nav className="space-y-1.5">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-4 py-3 text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:text-orange-700 transition-all duration-300 transform hover:translate-x-1 hover:shadow-md relative overflow-hidden"
                    onClick={() => setSidebarOpen(false)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Subtle hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-amber-400/5 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative z-10 flex items-center w-full">
                      <div className="p-2.5 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl group-hover:from-orange-200 group-hover:to-amber-200 transition-all duration-300 group-hover:scale-110 shadow-sm">
                        <Icon className="h-5 w-5 text-orange-600 group-hover:text-amber-600 transition-colors duration-300" />
                      </div>
                      <span className="ml-4 font-semibold text-base tracking-wide font-serif">
                        {item.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-gray-200/60 p-5 flex-shrink-0 relative z-10 bg-white/60 backdrop-blur-xl">
            <div className="flex items-center mb-4 p-3 bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-md rounded-xl hover:from-orange-100/80 hover:to-amber-100/80 transition-all duration-300 transform hover:scale-[1.02] shadow-sm hover:shadow-md">
              {userData?.profileImage && (
                <div className="mr-3 flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full blur-sm opacity-40"></div>
                    <img
                      src={getSmallThumbnailUrl(userData.profileImage) || userData.profileImage}
                      alt={userData.name || 'Profile'}
                      className="relative w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate font-display tracking-wide">
                  {userData?.name}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {getRoleDisplayName(getHighestRole(userData?.role || 'student'))}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="group flex items-center justify-center w-full px-4 py-3 text-red-600 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg font-semibold border border-red-200 hover:border-red-500 relative z-50 cursor-pointer"
            >
              <LogOut className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-serif tracking-wide">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md shadow-sm h-16 flex items-center px-4 lg:px-8 flex-shrink-0 border-b border-gray-200/60 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="lg:hidden font-display font-bold text-lg text-orange-700">
              ISKCON Platform
            </span>
          </div>

          <div className="flex-1 lg:block hidden" />

          {/* User Profile & Logout - Visible on both Mobile and Desktop now, adapted styling */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* User Profile */}
            <div className="flex items-center gap-2 lg:gap-2.5 px-2 py-1.5 lg:px-3 lg:py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg hover:from-orange-100 hover:to-amber-100 transition-all duration-200 border border-orange-100/50">
              {userData?.profileImage && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full blur-sm opacity-30"></div>
                  <img
                    src={getSmallThumbnailUrl(userData.profileImage) || userData.profileImage}
                    alt={userData.name || 'Profile'}
                    className="relative w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <p className="text-sm font-semibold text-gray-800 leading-tight max-w-[100px] truncate">
                  {userData?.name}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  {getRoleDisplayName(getHighestRole(userData?.role || 'student'))}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="group flex items-center justify-center lg:gap-2 w-10 h-10 lg:w-auto lg:h-auto lg:px-3 lg:py-2 text-red-600 bg-red-50 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-200 font-medium border border-red-100 hover:border-red-500 hover:shadow-md"
              title="Logout"
            >
              <LogOut className="h-5 w-5 lg:h-4 lg:w-4 group-hover:rotate-12 transition-transform duration-200" />
              <span className="hidden lg:inline text-sm">Logout</span>
            </button>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {showNotificationBanner && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-2xl p-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-3">
                <Bell className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Enable Notifications</h3>
                  <p className="text-sm text-blue-50 mb-3">
                    Get instant notifications when you receive new messages, just like WhatsApp!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                    >
                      Enable
                    </button>
                    <button
                      onClick={() => setShowNotificationBanner(false)}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg font-semibold transition-colors text-sm"
                    >
                      Later
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationBanner(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>

        {/* Floating Unread Messages Indicator */}
        {unreadCount > 0 && (
          <Link
            href="/dashboard/messages"
            className="fixed bottom-6 right-6 z-50 group"
          >
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-3 px-5 py-3 animate-bounce hover:animate-none">
                <MessageSquare className="h-5 w-5" />
                <span className="font-bold text-sm">
                  {unreadCount} Unread {unreadCount === 1 ? 'Message' : 'Messages'}
                </span>
              </div>
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-ping"></span>
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full"></span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
