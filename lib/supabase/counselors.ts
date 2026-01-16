import { supabase } from './config';
import { User } from '@/types';
import { normalizeRoleFromFirestore } from '@/lib/utils/roles';

/**
 * Get all users who have a specific counselor email assigned to them
 * This queries Supabase users table directly by counselor email columns
 */
export const getUsersByCounselorEmail = async (counselorEmail: string): Promise<User[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Query users where brahmachari_counselor_email or grihastha_counselor_email matches
    const lowerEmail = counselorEmail.toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`brahmachari_counselor_email.eq.${lowerEmail},grihastha_counselor_email.eq.${lowerEmail}`);

    if (error) {
      console.error('Error fetching users by counselor email:', error);
      throw new Error('Failed to fetch users by counselor email');
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      // Build hierarchy from separate columns (preferred) or JSONB (fallback)
      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        hierarchy: hierarchy,
        // Map camp completion fields
        campDys: user.camp_dys,
        campSankalpa: user.camp_sankalpa,
        campSphurti: user.camp_sphurti,
        campUtkarsh: user.camp_utkarsh,
        campFaithAndDoubt: user.camp_faith_and_doubt,
        campSrcgdWorkshop: user.camp_srcgd_workshop,
        campNistha: user.camp_nistha,
        campAshray: user.camp_ashray,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by counselor email:', error);
    throw error;
  }
};
