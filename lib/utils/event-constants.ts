import { getRoleDisplayName, RoleNumber } from './roles';

export const ashramOptions = [
    { id: 'Student', name: 'Student' },
    { id: 'Not decided', name: 'Not Decided' },
    { id: 'Gauranga Sabha', name: 'Gauranga Sabha' },
    { id: 'Nityananda Sabha', name: 'Nityananda Sabha' },
    { id: 'Brahmachari', name: 'Brahmachari Ashram' },
    { id: 'Grihastha', name: 'Grihastha Ashram' },
    { id: 'Staying Single (Not planning to marry)', name: 'Staying Single (Not planning to marry)' }
];

export const roleOptions = Array.from({ length: 30 }, (_, i) => i + 1).map(num => ({
    id: String(num),
    name: getRoleDisplayName(num as RoleNumber)
}));

export const campOptions = [
    { id: 'campDys', name: 'DYS (Discover Your Self)' },
    { id: 'campSankalpa', name: 'Sankalpa' },
    { id: 'campSphurti', name: 'Sphurti' },
    { id: 'campUtkarsh', name: 'Utkarsh' },
    { id: 'campFaithAndDoubt', name: 'Faith and Doubt' },
    { id: 'campSrcgdWorkshop', name: 'SRCGD Workshop' },
    { id: 'campNistha', name: 'Nistha' },
    { id: 'campAshray', name: 'Ashray' },
    { id: 'campJigyasa', name: 'Jigyasa' },
    { id: 'campSadhana', name: 'Sadhana' }
];
