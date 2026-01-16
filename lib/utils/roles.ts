import { UserRole } from '@/types';

export type RoleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Helper function to get role hierarchy number
const getRoleHierarchyNumber = (role: UserRole): number => {
  if (typeof role === 'number') {
    return role;
  }
  // Check if it's a numeric string
  if (typeof role === 'string' && !isNaN(Number(role)) && role.trim() !== '') {
    const numRole = Number(role);
    if (numRole >= 1 && numRole <= 8) {
      return numRole;
    }
  }

  const hierarchy: Record<string, number> = {
    super_admin: 8,
    zonal_admin: 7,
    state_admin: 6,
    city_admin: 5,
    center_admin: 4,
    bc_voice_manager: 4, // BC Voice Manager (same as center_admin)
    senior_counselor: 3,
    voice_manager: 3, // Voice Manager (same as senior_counselor)
    counselor: 2,
    student: 1,
  };
  return hierarchy[role] || 1;
};

export const roleHierarchy = {
  get: (role: UserRole): number => getRoleHierarchyNumber(role),
} as any; // Using a getter-like object to handle both string and number roles

// Reverse mapping: number to role name
export const roleNumberToName: Record<RoleNumber, UserRole> = {
  8: 'super_admin',
  7: 'zonal_admin',
  6: 'state_admin',
  5: 'city_admin',
  4: 'center_admin',
  3: 'senior_counselor',
  2: 'counselor',
  1: 'student',
};

// Convert role name(s) to number(s) for Firestore storage
export const roleToNumber = (role: UserRole | UserRole[]): RoleNumber | RoleNumber[] => {
  if (Array.isArray(role)) {
    return role.map(r => getRoleHierarchyNumber(r) as RoleNumber);
  }
  return getRoleHierarchyNumber(role) as RoleNumber;
};

// Convert role number(s) to name(s) from Firestore
export const numberToRole = (roleNumber: RoleNumber | RoleNumber[] | number | number[]): UserRole | UserRole[] => {
  // Handle both single numbers and arrays
  const numbers = Array.isArray(roleNumber) ? roleNumber : [roleNumber];
  const roles = numbers.map(num => {
    const role = roleNumberToName[num as RoleNumber];
    if (!role) {
      // Fallback: if number doesn't match, default to student (1)
      console.warn(`Invalid role number: ${num}, defaulting to student`);
      return 'student';
    }
    return role;
  });
  return Array.isArray(roleNumber) ? roles : roles[0];
};

// Helper to normalize role from Firestore (handles both old string format and new number format)
export const normalizeRoleFromFirestore = (role: any): UserRole | UserRole[] => {
  if (role === null || role === undefined) {
    return 'student';
  }

  // If it's already a string (backward compatibility)
  if (typeof role === 'string') {
    return role as UserRole;
  }

  // If it's a number or array of numbers (new format)
  if (typeof role === 'number' || (Array.isArray(role) && typeof role[0] === 'number')) {
    return numberToRole(role);
  }

  // If it's an array of strings (backward compatibility)
  if (Array.isArray(role) && typeof role[0] === 'string') {
    return role as UserRole[];
  }

  // Default fallback
  return 'student';
};

export const canAccessLevel = (userRole: UserRole | UserRole[], targetRole: UserRole): boolean => {
  const userRoles = Array.isArray(userRole) ? userRole : [userRole];
  const userMaxLevel = Math.max(...userRoles.map(role => getRoleHierarchyNumber(role)));
  return userMaxLevel >= getRoleHierarchyNumber(targetRole);
};

export const getRoleDisplayName = (role: UserRole): string => {
  // Handle numeric roles by converting to string first
  if (typeof role === 'number') {
    const roleName = roleNumberToName[role as RoleNumber];
    role = roleName || 'student';
  }

  const displayNames: Record<string, string> = {
    super_admin: 'Super Admin',
    zonal_admin: 'Zone Manager',
    state_admin: 'State Manager',
    city_admin: 'City Manager',
    center_admin: 'BC Voice Manager',
    bc_voice_manager: 'BC Voice Manager',
    senior_counselor: 'Voice Manager',
    voice_manager: 'Voice Manager',
    counselor: 'Counselor',
    student: 'Student',
  };
  return displayNames[role as string] || 'Student';
};

export const getRolesDisplayNames = (roles: UserRole | UserRole[]): string => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return rolesArray.map(role => getRoleDisplayName(role)).join(', ');
};

export const getUserMaxRoleLevel = (roles: UserRole | UserRole[]): number => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return Math.max(...rolesArray.map(role => getRoleHierarchyNumber(role)));
};

// Get the highest role from an array of roles
export const getHighestRole = (roles: UserRole | UserRole[]): UserRole => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];

  if (rolesArray.length === 0) {
    return 'student';
  }

  if (rolesArray.length === 1) {
    return rolesArray[0];
  }

  // Find the role with the highest hierarchy number
  let highestRole = rolesArray[0];
  let highestLevel = getRoleHierarchyNumber(rolesArray[0]);

  for (let i = 1; i < rolesArray.length; i++) {
    const level = getRoleHierarchyNumber(rolesArray[i]);
    if (level > highestLevel) {
      highestLevel = level;
      highestRole = rolesArray[i];
    }
  }

  return highestRole;
};

export const hasRole = (userRoles: UserRole | UserRole[], targetRole: UserRole): boolean => {
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  return rolesArray.includes(targetRole);
};

// Check if a role number represents an admin role
export const isAdminRoleNumber = (roleNumber: number): boolean => {
  return roleNumber >= 4 && roleNumber <= 8; // center_admin (4) to super_admin (8)
};

// Check if a role number represents super admin
export const isSuperAdminRoleNumber = (roleNumber: number): boolean => {
  return roleNumber === 8;
};
