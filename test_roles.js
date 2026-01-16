
// Mock the function to test logic
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

const getRoleHierarchyNumber = (role) => {
    if (typeof role === 'number') {
        return role;
    }
    // Logic from the file
    return hierarchy[role] || 1;
};

console.log('Testing getRoleHierarchyNumber:');
console.log('8 (number):', getRoleHierarchyNumber(8));
console.log('"8" (string):', getRoleHierarchyNumber("8"));
console.log('"super_admin":', getRoleHierarchyNumber("super_admin"));
console.log('"unknown":', getRoleHierarchyNumber("unknown"));
