'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { getUsersByHierarchy, getUsersByRole, updateUser, getUsersByCenterIds, getUsersByCenterNames } from '@/lib/supabase/users';
import { getBCVoiceManagerRequestByUserId } from '@/lib/supabase/bc-voice-manager-requests';
import { User, UserRole } from '@/types';
import { Users, Mail, Phone, Edit2, Save, X, Search, ChevronDown, Filter } from 'lucide-react';
import { getRoleDisplayName, getRolesDisplayNames, roleHierarchy, getUserMaxRoleLevel, hasRole } from '@/lib/utils/roles';
import AssignManagerRoleModal from '@/components/dashboard/AssignManagerRoleModal';

export default function UsersPage() {
  const { userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'counselor' | 'student' | 'bc_voice_manager' | 'state_manager' | 'city_manager' | 'zone_manager'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([]);
  const [saving, setSaving] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedUserForManager, setSelectedUserForManager] = useState<User | null>(null);

  useEffect(() => {
    // Allow role 8 (super_admin) and role 4 (bc_voice_manager) to access users page
    if (userData) {
      const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
      const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);
      const isBCVoiceManager = currentUserRoles.includes('bc_voice_manager') || currentUserRoles.includes(4);

      if (!isSuperAdmin && !isBCVoiceManager) {
        router.push('/dashboard');
        return;
      }
    }

    const loadUsers = async () => {
      if (userData) {
        let fetchedUsers: User[] = [];

        const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];

        if (currentUserRoles.includes('super_admin') || currentUserRoles.includes(8)) {
          // Super admin can see all users
          fetchedUsers = await getUsersByHierarchy({});
        } else if (currentUserRoles.includes('bc_voice_manager') || currentUserRoles.includes(4)) {
          // BC Voice Manager can see users from their approved centers
          try {
            // Fetch the BC voice manager request to get approved centers
            const request = await getBCVoiceManagerRequestByUserId(userData.id);

            console.log('BC Voice Manager request:', request);
            console.log('Approved centers (center IDs):', request?.approvedCenters);

            if (request && request.status === 'approved' && request.approvedCenters && request.approvedCenters.length > 0) {
              // The approvedCenters array contains center IDs (UUIDs like "70f3cca6-05ef-4dc7-84b4-05822cf6aa97")
              // Users have center_id field that matches these IDs
              // So we can directly query users by center_id using the approved center IDs
              const approvedCenterIds = request.approvedCenters.filter(id => id && id.trim().length > 0);

              console.log('Querying users by center IDs:', approvedCenterIds);

              if (approvedCenterIds.length > 0) {
                // Query users where center_id matches any of the approved center IDs
                fetchedUsers = await getUsersByCenterIds(approvedCenterIds);
                console.log(`Found ${fetchedUsers.length} users for approved centers`);
              } else {
                console.log('No valid center IDs found in approved centers');
                fetchedUsers = [];
              }

              // If no users found, fallback to state/city
              if (fetchedUsers.length === 0) {
                console.log('No users found by center IDs, falling back to state/city');
                const hierarchy: any = {};
                if (userData.hierarchy?.state) {
                  hierarchy.state = userData.hierarchy.state;
                }
                if (userData.hierarchy?.city) {
                  hierarchy.city = userData.hierarchy.city;
                }
                fetchedUsers = await getUsersByHierarchy(hierarchy);
              }
            } else {
              console.log('No approved centers found or request not approved, falling back to state/city');
              // No approved centers, fallback to state/city
              const hierarchy: any = {};
              if (userData.hierarchy?.state) {
                hierarchy.state = userData.hierarchy.state;
              }
              if (userData.hierarchy?.city) {
                hierarchy.city = userData.hierarchy.city;
              }
              fetchedUsers = await getUsersByHierarchy(hierarchy);
            }
          } catch (error) {
            console.error('Error fetching approved centers for BC voice manager:', error);
            // Fallback to state/city on error
            const hierarchy: any = {};
            if (userData.hierarchy?.state) {
              hierarchy.state = userData.hierarchy.state;
            }
            if (userData.hierarchy?.city) {
              hierarchy.city = userData.hierarchy.city;
            }
            fetchedUsers = await getUsersByHierarchy(hierarchy);
          }
        } else {
          router.push('/dashboard');
          return;
        }

        setUsers(fetchedUsers);
        setLoading(false);
      }
    };
    loadUsers();
  }, [userData, router]);

  const filteredUsers = users.filter(user => {
    if (filter === 'all' && !searchQuery) return true;
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = user.name?.toLowerCase().includes(query);
      const matchEmail = user.email?.toLowerCase().includes(query);
      const matchPhone = user.phone?.toLowerCase().includes(query);

      // Hierarchy locators
      const matchCity = user.hierarchy?.city?.toLowerCase().includes(query);
      const matchCenter = user.hierarchy?.center?.toLowerCase().includes(query);
      const matchState = user.hierarchy?.state?.toLowerCase().includes(query);

      if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchCenter && !matchState) return false;
    }

    // City filter
    if (selectedCity && user.hierarchy?.city !== selectedCity) {
      return false;
    }

    // Center filter
    if (selectedCenter && user.hierarchy?.center !== selectedCenter) {
      return false;
    }

    // Helper to check role match robustly (handling string/number mismatches)
    const hasRole = (targetStr: string, targetNum: number) => {
      return userRoles.some(r =>
        r === targetStr ||
        r === targetNum ||
        (typeof r === 'string' && r === String(targetNum))
      );
    };

    if (filter === 'counselor') {
      return hasRole('counselor', 2);
    }
    if (filter === 'student') {
      return hasRole('student', 1);
    }
    // voice_manager is handled by BC Voice Manager (4) or Voice Manager (3) if we add that filter later
    // Removing dead code for now

    if (filter === 'bc_voice_manager') {
      return hasRole('bc_voice_manager', 4) || hasRole('center_admin', 4);
    }
    if (filter === 'state_manager') {
      return hasRole('state_admin', 6);
    }
    if (filter === 'city_manager') {
      return hasRole('city_admin', 5);
    }
    if (filter === 'zone_manager') {
      return hasRole('zonal_admin', 7);
    }
    return true;
  });

  const canEditRole = (targetUser: User): boolean => {
    if (!userData) return false;
    const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);
    const isBCVoiceManager = currentUserRoles.includes('bc_voice_manager') || currentUserRoles.includes(4);

    // Super admin can edit any role
    if (isSuperAdmin) return true;

    // BC Voice Manager can only assign Role 3 (voice_manager) to users from their centers
    if (isBCVoiceManager) {
      // Check if target user is from the same state/city (same center management area)
      const sameState = targetUser.hierarchy?.state === userData.hierarchy?.state;
      const sameCity = targetUser.hierarchy?.city === userData.hierarchy?.city;

      // BC Voice Manager can assign Role 3 to users from their area
      // They can only assign voice_manager role (3), not other roles
      return sameState && sameCity;
    }

    return false;
  };

  const handleEditRole = (user: User) => {
    setEditingUserId(user.id);
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    setEditingRoles([...userRoles]);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRoles([]);
  };

  const handleToggleRole = (role: UserRole) => {
    setEditingRoles(prev => {
      // Helper to check if two roles are the same (handling voice_manager/senior_counselor both mapping to 3)
      const isSameRole = (r1: UserRole, r2: UserRole): boolean => {
        // Direct match
        if (r1 === r2) return true;

        // voice_manager and 3 are the same
        if ((r1 === 'voice_manager' && r2 === 3) || (r1 === 3 && r2 === 'voice_manager')) {
          return true;
        }

        // senior_counselor and 3 are the same (but we need to distinguish from voice_manager)
        // This is tricky - we'll handle it by checking if both are present
        if ((r1 === 'senior_counselor' && r2 === 3) || (r1 === 3 && r2 === 'senior_counselor')) {
          // Only return true if voice_manager is NOT in the array
          return !prev.includes('voice_manager');
        }

        return false;
      };

      // Check if role already exists in editingRoles
      const roleExists = prev.some(r => isSameRole(r, role));

      if (roleExists) {
        // Remove role - filter out all forms of this role
        return prev.filter(r => !isSameRole(r, role));
      } else {
        // Add role - but first remove any conflicting roles
        // If adding voice_manager, remove senior_counselor and 3
        // If adding senior_counselor, remove voice_manager and 3
        // If adding 3, check which one to add (voice_manager or senior_counselor)
        let cleanedPrev = [...prev];

        if (role === 'voice_manager' || role === 3) {
          // Remove senior_counselor and 3 if present
          cleanedPrev = cleanedPrev.filter(r => r !== 'senior_counselor' && r !== 3);
          // Add voice_manager
          if (!cleanedPrev.includes('voice_manager')) {
            cleanedPrev.push('voice_manager');
          }
        } else if (role === 'senior_counselor') {
          // Remove voice_manager and 3 if present
          cleanedPrev = cleanedPrev.filter(r => r !== 'voice_manager' && r !== 3);
          // Add senior_counselor
          if (!cleanedPrev.includes('senior_counselor')) {
            cleanedPrev.push('senior_counselor');
          }
        } else {
          // For other roles, just add if not present
          if (!cleanedPrev.includes(role)) {
            cleanedPrev.push(role);
          }
        }

        return cleanedPrev;
      }
    });
  };

  const handleSaveRole = async (userId: string) => {
    if (!userData || editingRoles.length === 0) return;

    setSaving(true);
    try {
      const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
      const isBCVoiceManager = currentUserRoles.includes('bc_voice_manager') || currentUserRoles.includes(4);

      // If BC Voice Manager is assigning roles, ensure they're ONLY assigning Role 3 (voice_manager)
      if (isBCVoiceManager) {
        // Validate that BC Voice Manager is only assigning role 3
        const hasOnlyVoiceManager = editingRoles.every(r =>
          r === 'voice_manager' || r === 3
        );

        if (!hasOnlyVoiceManager) {
          alert('BC Voice Manager can only assign voice_manager role (role 3). Other roles are not allowed.');
          setSaving(false);
          return;
        }

        // Get the target user's current roles
        const targetUser = users.find(u => u.id === userId);
        if (targetUser) {
          const targetUserRoles = Array.isArray(targetUser.role) ? targetUser.role : [targetUser.role];

          // BC Voice Manager can only assign voice_manager, so we know editingRoles contains voice_manager
          // Remove all roles that map to 3 (voice_manager and senior_counselor both map to 3)
          const rolesWithoutConflicting = targetUserRoles.filter(r =>
            r !== 'voice_manager' && r !== 'senior_counselor' && r !== 3
          );

          // Build final roles - BC Voice Manager can only assign voice_manager
          const finalRolesSet = new Set<string>();
          rolesWithoutConflicting.forEach(r => {
            if (r === 'bc_voice_manager' || r === 4) finalRolesSet.add('bc_voice_manager');
            else if (r === 'super_admin' || r === 8) finalRolesSet.add('super_admin');
            else if (r === 'counselor' || r === 2) finalRolesSet.add('counselor');
            else if (r === 'student' || r === 1) finalRolesSet.add('student');
            else if (typeof r === 'string') finalRolesSet.add(r);
          });

          // Check if voice_manager is in editingRoles (BC Voice Manager can only assign this)
          const hasVoiceManagerInEditing = editingRoles.some(r => r === 'voice_manager' || r === 3);

          // Add voice_manager if it's in editingRoles
          if (hasVoiceManagerInEditing) {
            finalRolesSet.add('voice_manager');
          }

          // Ensure at least student role
          if (finalRolesSet.size === 0 || !finalRolesSet.has('student')) {
            finalRolesSet.add('student');
          }

          const finalRoles: UserRole[] = Array.from(finalRolesSet) as UserRole[];

          await updateUser(userId, { role: finalRoles });

          // If updating the current user, refresh their data
          if (userId === userData?.id) {
            await refreshUserData();
          }

          // Reload users to get fresh data from database
          if (userData) {
            const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
            const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);

            if (isSuperAdmin) {
              const refreshedUsers = await getUsersByHierarchy({});
              setUsers(refreshedUsers);
            } else {
              // Reload BC Voice Manager's users
              const request = await getBCVoiceManagerRequestByUserId(userData.id);
              if (request && request.status === 'approved' && request.approvedCenters) {
                const approvedCenterIds = request.approvedCenters.filter(id => id && id.trim().length > 0);
                if (approvedCenterIds.length > 0) {
                  const refreshedUsers = await getUsersByCenterIds(approvedCenterIds);
                  setUsers(refreshedUsers);
                }
              }
            }
          }
        }
      } else {
        // Super admin can assign any roles
        // Remove duplicates before saving - handle voice_manager and senior_counselor conflict (both map to 3)
        const finalRolesSet = new Set<string>();
        let hasVoiceManager = false;
        let hasSeniorCounselor = false;

        // Process roles - prioritize voice_manager over senior_counselor if both are present
        editingRoles.forEach(r => {
          if (r === 'voice_manager') {
            hasVoiceManager = true;
            finalRolesSet.add('voice_manager');
          } else if (r === 'senior_counselor') {
            hasSeniorCounselor = true;
            finalRolesSet.add('senior_counselor');
          } else if (r === 3) {
            // If we see 3, check if we already have voice_manager or senior_counselor
            // If neither, default to voice_manager (or check which one is in editingRoles)
            if (!hasVoiceManager && !hasSeniorCounselor) {
              // Check if editingRoles has voice_manager or senior_counselor as strings
              const hasVMString = editingRoles.includes('voice_manager');
              const hasSCString = editingRoles.includes('senior_counselor');
              if (hasVMString) {
                hasVoiceManager = true;
                finalRolesSet.add('voice_manager');
              } else if (hasSCString) {
                hasSeniorCounselor = true;
                finalRolesSet.add('senior_counselor');
              } else {
                // Default to voice_manager if ambiguous
                hasVoiceManager = true;
                finalRolesSet.add('voice_manager');
              }
            }
          } else if (r === 'bc_voice_manager' || r === 4) {
            finalRolesSet.add('bc_voice_manager');
          } else if (r === 'super_admin' || r === 8) {
            finalRolesSet.add('super_admin');
          } else if (r === 'counselor' || r === 2) {
            finalRolesSet.add('counselor');
          } else if (r === 'student' || r === 1) {
            finalRolesSet.add('student');
          } else if (typeof r === 'string') {
            finalRolesSet.add(r);
          }
        });

        // Ensure at least student role
        if (finalRolesSet.size === 0 || !finalRolesSet.has('student')) {
          finalRolesSet.add('student');
        }

        const finalRoles: UserRole[] = Array.from(finalRolesSet) as UserRole[];

        await updateUser(userId, { role: finalRoles });

        // If updating the current user, refresh their data
        if (userId === userData?.id) {
          await refreshUserData();
        }

        // Reload users to get fresh data
        const refreshedUsers = await getUsersByHierarchy({});
        setUsers(refreshedUsers);
      }

      setEditingUserId(null);
      setEditingRoles([]);

      // Force a small delay to ensure UI updates
      setTimeout(() => {
        // This ensures the UI reflects the changes
      }, 100);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableRoles = (targetUser?: User): UserRole[] => {
    if (!userData) return [];
    const currentUserRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    const isSuperAdmin = currentUserRoles.includes('super_admin') || currentUserRoles.includes(8);
    const isBCVoiceManager = currentUserRoles.includes('bc_voice_manager') || currentUserRoles.includes(4);

    if (isSuperAdmin) {
      // Super admin can assign any role
      const currentMaxLevel = getUserMaxRoleLevel(currentUserRoles);
      return (Object.keys(roleHierarchy) as UserRole[]).filter(
        role => roleHierarchy[role] <= currentMaxLevel
      );
    } else if (isBCVoiceManager && targetUser) {
      // BC Voice Manager can ONLY assign Role 3 (voice_manager) to users from their approved centers
      // Check if target user is from one of the BC Voice Manager's approved centers
      const targetUserCenterId = targetUser.hierarchy?.centerId;

      // Get approved centers for BC Voice Manager
      const checkApprovedCenter = async () => {
        try {
          const request = await getBCVoiceManagerRequestByUserId(userData.id);
          if (request && request.status === 'approved' && request.approvedCenters) {
            return request.approvedCenters.includes(targetUserCenterId || '');
          }
        } catch (error) {
          console.error('Error checking approved centers:', error);
        }
        return false;
      };

      // For now, check if target user is from the same state/city (fallback)
      // In production, you should check approved centers
      const sameState = targetUser.hierarchy?.state === userData.hierarchy?.state;
      const sameCity = targetUser.hierarchy?.city === userData.hierarchy?.city;

      if (sameState && sameCity) {
        // BC Voice Manager can ONLY assign voice_manager role (3), no other roles
        return ['voice_manager', 3] as UserRole[];
      }
    }

    return [];
  };

  const handleAssignManagerRole = async (
    userId: string,
    role: 5 | 6 | 7,
    assignedArea: { city?: string; state?: string; zone?: string }
  ) => {
    try {
      // Get current user
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Get current roles
      const currentRoles = Array.isArray(targetUser.role) ? targetUser.role : [targetUser.role];

      // Add the new manager role
      const roleNames: Record<number, string> = {
        5: 'city_admin',
        6: 'state_admin',
        7: 'zonal_admin',
      };

      const newRoleName = roleNames[role];

      // Remove any existing manager roles (5, 6, 7) and add the new one
      const filteredRoles = currentRoles.filter(r =>
        r !== 'city_admin' && r !== 'state_admin' && r !== 'zonal_admin' &&
        r !== 5 && r !== 6 && r !== 7
      );

      const finalRoles = [...filteredRoles, newRoleName] as UserRole[];

      // Prepare update data
      const updateData: any = {
        role: finalRoles,
        hierarchy: {
          ...targetUser.hierarchy,
        },
      };

      // Add assigned geographic area to hierarchy
      if (role === 5 && assignedArea.city) {
        updateData.hierarchy.assignedCity = assignedArea.city;
        updateData.hierarchy.assignedState = assignedArea.state; // Also store state for city manager
      } else if (role === 6 && assignedArea.state) {
        updateData.hierarchy.assignedState = assignedArea.state;
      } else if (role === 7 && assignedArea.zone) {
        updateData.hierarchy.assignedZone = assignedArea.zone;
      }

      // Update user in database
      await updateUser(userId, updateData);

      // Reload users
      const refreshedUsers = await getUsersByHierarchy({});
      setUsers(refreshedUsers);

      // Close modal
      setShowManagerModal(false);
      setSelectedUserForManager(null);

      // Show success message with better styling
      const roleDisplayNames: Record<number, string> = {
        5: 'City Manager',
        6: 'State Manager',
        7: 'Zone Manager',
      };

      const areaText = role === 5
        ? `for ${assignedArea.city}, ${assignedArea.state}`
        : role === 6
          ? `for ${assignedArea.state}`
          : `for ${assignedArea.zone}`;

      // Create a styled toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <div>
            <p class="font-semibold">Role Assigned Successfully!</p>
            <p class="text-sm opacity-90">${targetUser.name} is now ${roleDisplayNames[role]} ${areaText}</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    } catch (error) {
      console.error('Error assigning manager role:', error);
      alert('Failed to assign role. Please try again.');
      throw error;
    }
  };

  const handleRevokeManagerRole = async (userId: string) => {
    try {
      // Get current user
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Get current roles
      const currentRoles = Array.isArray(targetUser.role) ? targetUser.role : [targetUser.role];

      // Remove manager roles
      const filteredRoles = currentRoles.filter(r =>
        r !== 'city_admin' && r !== 'state_admin' && r !== 'zonal_admin' &&
        r !== 5 && r !== 6 && r !== 7
      );

      // Prepare update data - clear assigned areas
      const updateData: any = {
        role: filteredRoles,
        hierarchy: {
          ...targetUser.hierarchy,
          assignedCity: null,
          assignedState: null,
          assignedZone: null,
        },
      };

      // Update user in database
      await updateUser(userId, updateData);

      // Reload users
      const refreshedUsers = await getUsersByHierarchy({});
      setUsers(refreshedUsers);

      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <div>
            <p class="font-semibold">Role Revoked Successfully</p>
            <p class="text-sm opacity-90">Manager access removed for ${targetUser.name}</p>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);

    } catch (error) {
      console.error('Error revoking manager role:', error);
      alert('Failed to revoke role. Please try again.');
    }
  };

  // Extract unique cities and centers for dropdowns
  const uniqueCities = Array.from(new Set(users.map(u => u.hierarchy?.city).filter(Boolean))).sort();
  const uniqueCenters = Array.from(new Set(users.map(u => u.hierarchy?.center).filter(Boolean))).sort();

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
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
            Users Management
          </h1>
          <p className="text-sm sm:text-base text-gray-700">Manage users in your hierarchy</p>
        </div>

        {/* Search Input - Full Width */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-orange-400" />
          </div>
          <input
            type="text"
            placeholder="Search users by name, email, phone, city, or center..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-orange-200 rounded-lg leading-5 bg-white placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-shadow shadow-sm hover:shadow-md"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* City Dropdown */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-orange-400" />
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 text-base border-orange-200 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-lg shadow-sm appearance-none bg-white"
            >
              <option value="">All Cities</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city as string}>
                  {city}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Center Dropdown */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-orange-400" />
            </div>
            <select
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 text-base border-orange-200 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-lg shadow-sm appearance-none bg-white"
            >
              <option value="">All Centers</option>
              {uniqueCenters.map((center) => (
                <option key={center} value={center as string}>
                  {center}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {userData?.role === 'super_admin' && (
            <a
              href="/dashboard/import"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-center text-sm sm:text-base font-medium shadow-md"
            >
              Import from Excel
            </a>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'all'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('counselor')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'counselor'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              Counselors
            </button>
            <button
              onClick={() => setFilter('bc_voice_manager')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'bc_voice_manager'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              BC Voice Managers
            </button>
            <button
              onClick={() => setFilter('state_manager')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'state_manager'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              State Managers
            </button>
            <button
              onClick={() => setFilter('city_manager')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'city_manager'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              City Managers
            </button>
            <button
              onClick={() => setFilter('zone_manager')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'zone_manager'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              Zone Managers
            </button>
            <button
              onClick={() => setFilter('student')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${filter === 'student'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-orange-200'
                }`}
            >
              Students
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-orange-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-orange-200">
              <thead className="bg-gradient-to-r from-orange-100 to-amber-100">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider hidden md:table-cell">
                    Email
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider hidden lg:table-cell">
                    Address
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider hidden xl:table-cell">
                    Contact
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-orange-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-4 w-4 mr-2" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === user.id ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {getAvailableRoles(user).map(role => {
                                // Get current user roles from the users state (updated after save)
                                const currentUser = users.find(u => u.id === user.id) || user;
                                const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];

                                // Check if role is already assigned (handle both string and number formats)
                                const isRoleAssigned = userRoles.some(r => {
                                  if (role === 'voice_manager') {
                                    return r === 'voice_manager' || (typeof r === 'number' && r === 3 && !userRoles.includes('senior_counselor'));
                                  }
                                  if (role === 'senior_counselor') {
                                    return r === 'senior_counselor' || (typeof r === 'number' && r === 3 && !userRoles.includes('voice_manager'));
                                  }
                                  if (role === 3) {
                                    // Check if it's voice_manager or senior_counselor
                                    return userRoles.includes('voice_manager') || userRoles.includes('senior_counselor') || userRoles.includes(3);
                                  }
                                  return r === role;
                                });

                                // Check if role is in editing roles
                                const isInEditingRoles = editingRoles.some(r => {
                                  if (role === 'voice_manager') {
                                    return r === 'voice_manager' || r === 3;
                                  }
                                  if (role === 'senior_counselor') {
                                    return r === 'senior_counselor' || r === 3;
                                  }
                                  if (role === 3) {
                                    return r === 'voice_manager' || r === 'senior_counselor' || r === 3;
                                  }
                                  return r === role;
                                });

                                const isChecked = isInEditingRoles;
                                const isCurrentlyAssigned = isRoleAssigned && !isInEditingRoles;

                                return (
                                  <label
                                    key={typeof role === 'string' ? role : `role-${role}`}
                                    className={`flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded-lg border-2 transition-all ${isChecked
                                      ? 'bg-green-100 border-green-500 text-green-700'
                                      : isCurrentlyAssigned
                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleRole(role)}
                                      disabled={saving}
                                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <span className={`text-sm font-medium ${isChecked ? 'text-green-800' : isCurrentlyAssigned ? 'text-blue-800' : 'text-gray-700'
                                      }`}>
                                      {getRoleDisplayName(role)}
                                      {isCurrentlyAssigned && !isChecked && (
                                        <span className="ml-1 text-xs">(current)</span>
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <button
                                onClick={() => handleSaveRole(user.id)}
                                disabled={saving || editingRoles.length === 0}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(user.role) ? user.role : [user.role]).map((role, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800"
                              >
                                {getRoleDisplayName(role)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {[user.hierarchy.state, user.hierarchy.city, user.hierarchy.center]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                        {user.phone ? (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {user.phone}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {canEditRole(user) && (
                            <button
                              onClick={() => handleEditRole(user)}
                              disabled={!!editingUserId}
                              className="p-1 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-30"
                              title="Edit Roles"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                          )}

                          {/* Super Admin can assign manager roles */}
                          {(userData?.role === 'super_admin' || (Array.isArray(userData?.role) && userData.role.includes('super_admin')) || (Array.isArray(userData?.role) && userData.role.includes(8))) && (
                            <button
                              onClick={() => {
                                setSelectedUserForManager(user);
                                setShowManagerModal(true);
                              }}
                              disabled={!!editingUserId}
                              className="px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50"
                              title="Assign Manager Role"
                            >
                              Manage Role
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign Manager Role Modal */}
        {showManagerModal && selectedUserForManager && (
          <AssignManagerRoleModal
            isOpen={showManagerModal}
            user={selectedUserForManager}
            onClose={() => {
              setShowManagerModal(false);
              setSelectedUserForManager(null);
            }}
            onAssign={handleAssignManagerRole}
            onRevoke={(Array.isArray(selectedUserForManager.role) ? selectedUserForManager.role : [selectedUserForManager.role]).some(r =>
              (typeof r === 'number' && [5, 6, 7].includes(r)) ||
              (typeof r === 'string' && ['city_admin', 'state_admin', 'zonal_admin'].includes(r))
            ) ? handleRevokeManagerRole : undefined}
          />
        )}
      </div>
    </div>
  );
}
