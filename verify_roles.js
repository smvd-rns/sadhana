
// Updated mock to match fix
const getRoleHierarchyNumber = (role) => {
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

    const hierarchy = {
        super_admin: 8,
        zonal_admin: 7,
        state_admin: 6,
        city_admin: 5,
        center_admin: 4,
        bc_voice_manager: 4,
        senior_counselor: 3,
        voice_manager: 3,
        counselor: 2,
        student: 1,
    };
    return hierarchy[role] || 1;
};

console.log('Testing getRoleHierarchyNumber FIX:');
console.log('8 (number):', getRoleHierarchyNumber(8));
console.log('"8" (string):', getRoleHierarchyNumber("8"));
console.log('"  8  " (string with spaces):', getRoleHierarchyNumber("  8  "));
console.log('"super_admin":', getRoleHierarchyNumber("super_admin"));
console.log('"unknown":', getRoleHierarchyNumber("unknown"));
console.log('"99" (out of bounds):', getRoleHierarchyNumber("99"));
