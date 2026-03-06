import { supabase } from './config';
import { User, UserRole, EducationEntry, WorkExperienceEntry, LanguageEntry, SkillEntry, ServiceEntry } from '@/types';
import { roleToNumber, normalizeRoleFromFirestore } from '@/lib/utils/roles';
import { enrichHierarchyData } from './hierarchy-helpers';

export const getUsersByRole = async (role: UserRole) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    // Convert role to number for query
    const roleNumber = roleToNumber(role);
    const roleNumberArray = Array.isArray(roleNumber) ? roleNumber : [roleNumber];

    // Query for users with this role number in their role array
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .contains('role', roleNumberArray);

    if (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      // Build hierarchy from separate columns (preferred) or JSONB (fallback)
      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        counselorId: user.counselor_id || user.hierarchy?.counselorId,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        // Assigned geographic areas for manager roles
        assignedZone: user.assigned_zone || user.hierarchy?.assignedZone,
        assignedState: user.assigned_state || user.hierarchy?.assignedState,
        assignedCity: user.assigned_city || user.hierarchy?.assignedCity,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image, // Google Drive photo link
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        // Camp completion fields
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        // Education fields (build array from separate columns)
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        // Work experience fields (build array from separate columns)
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
};

export const getUsersByHierarchy = async (hierarchy: any) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    let query = supabase.from('users').select('*');

    // Query using separate columns (preferred) for better performance
    if (hierarchy.state) {
      query = query.eq('state', hierarchy.state);
    }
    if (hierarchy.city) {
      query = query.eq('city', hierarchy.city);
    }
    if (hierarchy.center) {
      // Try exact match first
      query = query.eq('center', hierarchy.center);
      console.log('Querying users by center:', hierarchy.center);
    }
    if (hierarchy.counselor) {
      query = query.eq('counselor', hierarchy.counselor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users by hierarchy:', error);
      return [];
    }

    console.log(`getUsersByHierarchy found ${data?.length || 0} users with filters:`, hierarchy);

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      // Build hierarchy from separate columns (preferred) or JSONB (fallback)
      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        counselorId: user.counselor_id || user.hierarchy?.counselorId,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image, // Google Drive photo link
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        // Camp completion fields
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        // Education fields (build array from separate columns)
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        // Work experience fields (build array from separate columns)
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by hierarchy:', error);
    return [];
  }
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Enrich hierarchy data with missing counselor emails and center_id before updating
    let enrichedHierarchy = updates.hierarchy;
    if (enrichedHierarchy) {
      console.log('updateUser - Enriching hierarchy before update:', JSON.stringify(enrichedHierarchy, null, 2));
      enrichedHierarchy = await enrichHierarchyData(enrichedHierarchy);
      console.log('updateUser - Enriched hierarchy after enrichment:', JSON.stringify(enrichedHierarchy, null, 2));
    }

    // Build update object for Supabase
    const dbUpdates: any = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.profileImage !== undefined) dbUpdates.profile_image = updates.profileImage; // Google Drive photo link
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
    if (updates.pushTokens !== undefined) dbUpdates.push_tokens = updates.pushTokens;

    // Handle direct field updates from registration form
    if ((updates as any).ashram !== undefined) dbUpdates.ashram = (updates as any).ashram;
    if ((updates as any).counselor !== undefined) dbUpdates.counselor = (updates as any).counselor;
    if ((updates as any).counselorId !== undefined) dbUpdates.counselor_id = (updates as any).counselorId;
    if ((updates as any).otherCounselor !== undefined) dbUpdates.other_counselor = (updates as any).otherCounselor;
    if ((updates as any).currentTemple !== undefined) dbUpdates.current_temple = (updates as any).currentTemple;
    if ((updates as any).currentCenter !== undefined) dbUpdates.current_center = (updates as any).currentCenter;
    if ((updates as any).otherCenter !== undefined) dbUpdates.other_center = (updates as any).otherCenter;
    if ((updates as any).otherTemple !== undefined) dbUpdates.other_temple = (updates as any).otherTemple;
    if ((updates as any).rejectionReason !== undefined) dbUpdates.rejection_reason = (updates as any).rejectionReason;
    if ((updates as any).reviewedBy !== undefined) dbUpdates.reviewed_by = (updates as any).reviewedBy;
    if ((updates as any).reviewedAt !== undefined) dbUpdates.reviewed_at = (updates as any).reviewedAt;


    // Handle hierarchy updates - update separate columns
    if (enrichedHierarchy) {
      dbUpdates.current_temple = enrichedHierarchy.currentTemple || null;
      dbUpdates.state = enrichedHierarchy.state || null;
      dbUpdates.city = enrichedHierarchy.city || null;
      dbUpdates.center = enrichedHierarchy.center || null;
      dbUpdates.current_center = enrichedHierarchy.currentCenter || enrichedHierarchy.center || null;
      dbUpdates.center_id = enrichedHierarchy.centerId || null;

      // Handle assigned geographic areas for manager roles
      if (enrichedHierarchy.assignedZone !== undefined) dbUpdates.assigned_zone = enrichedHierarchy.assignedZone || null;
      if (enrichedHierarchy.assignedState !== undefined) dbUpdates.assigned_state = enrichedHierarchy.assignedState || null;
      if (enrichedHierarchy.assignedCity !== undefined) dbUpdates.assigned_city = enrichedHierarchy.assignedCity || null;

      // Handle spiritual fields from hierarchy or direct updates
      dbUpdates.initiation_status = enrichedHierarchy.initiationStatus || null;
      dbUpdates.initiated_name = enrichedHierarchy.initiatedName || null;
      dbUpdates.spiritual_master_name = enrichedHierarchy.spiritualMasterName || null;
      dbUpdates.aspiring_spiritual_master_name = enrichedHierarchy.aspiringSpiritualMasterName || null;
      dbUpdates.chanting_since = enrichedHierarchy.chantingSince || null;
      dbUpdates.rounds = enrichedHierarchy.rounds ? parseInt(enrichedHierarchy.rounds.toString()) || null : null;
      dbUpdates.ashram = enrichedHierarchy.ashram || null;
      dbUpdates.royal_member = enrichedHierarchy.royalMember || null;
      dbUpdates.introduced_to_kc_in = enrichedHierarchy.introducedToKcIn || null;
      dbUpdates.parent_temple = enrichedHierarchy.parentTemple || null;
      dbUpdates.parent_center = enrichedHierarchy.parentCenter || null;

      // Handle unified counselor field (use other_counselor for all counselors)
      if (enrichedHierarchy.counselor) {
        dbUpdates.counselor = enrichedHierarchy.counselor;
        dbUpdates.counselor_id = enrichedHierarchy.counselorId || null;
        // Clear the old separate counselor fields
        dbUpdates.brahmachari_counselor = null;
        dbUpdates.grihastha_counselor = null;
      } else {
        // Fallback to old separate fields if new unified field not present
        dbUpdates.brahmachari_counselor = enrichedHierarchy.brahmachariCounselor || null;
        dbUpdates.brahmachari_counselor_email = enrichedHierarchy.brahmachariCounselorEmail || null;
        dbUpdates.grihastha_counselor = enrichedHierarchy.grihasthaCounselor || null;
        dbUpdates.grihastha_counselor_email = enrichedHierarchy.grihasthaCounselorEmail || null;
        dbUpdates.other_counselor = enrichedHierarchy.otherCounselor || null;
      }
      dbUpdates.other_center = enrichedHierarchy.otherCenter || null;
      dbUpdates.other_temple = enrichedHierarchy.otherTemple || null;

      // Also update JSONB for backward compatibility
      dbUpdates.hierarchy = enrichedHierarchy;
    }

    if (updates.role !== undefined) {
      // Convert role to number array
      const rolesArray = Array.isArray(updates.role) ? updates.role : [updates.role];
      const roleNumbers = roleToNumber(rolesArray);
      // Ensure unique role numbers
      const uniqueRoleNumbers = Array.isArray(roleNumbers)
        ? [...new Set(roleNumbers)]
        : [roleNumbers];

      dbUpdates.role = uniqueRoleNumbers;
    }

    dbUpdates.updated_at = new Date().toISOString();

    let result;

    // If we have an email, it might be a new record (or full update), so we use upsert
    if (dbUpdates.email) {
      result = await supabase
        .from('users')
        .upsert(dbUpdates)
        .eq('id', userId)
        .select();
    } else {
      // If no email, it's likely a partial update to an existing record
      // We use update() to avoid 'null value in column email' error if upsert tries to insert
      result = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId)
        .select();
    }

    const { data, error } = result;

    if (error) {
      console.error('updateUser - Supabase error:', error);
      throw new Error(error.message);
    }

    // If no rows were updated (empty data array), it means the user doesn't exist in the public table.
    // We should try to insert the record instead.
    if (!data || data.length === 0) {
      const insertData = {
        id: userId,
        ...dbUpdates,
        role: dbUpdates.role || [1], // Default to student if not provided
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('updateUser - Fallback INSERT failed:', insertError);
        throw new Error('User record missing and failed to create: ' + insertError.message);
      }
    }
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw new Error(error.message || 'Failed to update user');
  }
};

export const getUsersByCenterNames = async (centerNames: string[]) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    if (!centerNames || centerNames.length === 0) {
      return [];
    }

    // Query users by center names using .in() for multiple values
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('center', centerNames);

    if (error) {
      console.error('Error fetching users by center names:', error);
      return [];
    }

    console.log(`getUsersByCenterNames found ${data?.length || 0} users for centers:`, centerNames);

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        counselorId: user.counselor_id || user.hierarchy?.counselorId,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by center names:', error);
    return [];
  }
};

export const getUsersByCenterIds = async (centerIds: string[]) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    if (!centerIds || centerIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('center_id', centerIds);

    if (error) {
      console.error('❌ Error fetching users by center IDs:', error);
      return [];
    }

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        counselorId: user.counselor_id || user.hierarchy?.counselorId,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by center IDs:', error);
    return [];
  }
};

// Get users by zone (for Zone Managers - role 7)
export const getUsersByZone = async (zone: string) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    if (!zone) {
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('zone', zone);

    if (error) {
      console.error('Error fetching users by zone:', error);
      return [];
    }

    console.log(`getUsersByZone found ${data?.length || 0} users for zone:`, zone);

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      const hierarchy = {
        zone: user.zone || user.hierarchy?.zone,
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        counselorId: user.counselor_id || user.hierarchy?.counselorId,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        assignedZone: user.assigned_zone || user.hierarchy?.assignedZone,
        assignedState: user.assigned_state || user.hierarchy?.assignedState,
        assignedCity: user.assigned_city || user.hierarchy?.assignedCity,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by zone:', error);
    return [];
  }
};

// Get users by state (for State Managers - role 6)
export const getUsersByState = async (state: string) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    if (!state) {
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('state', state);

    if (error) {
      console.error('Error fetching users by state:', error);
      return [];
    }

    console.log(`getUsersByState found ${data?.length || 0} users for state:`, state);

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      const hierarchy = {
        zone: user.zone || user.hierarchy?.zone,
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        assignedZone: user.assigned_zone || user.hierarchy?.assignedZone,
        assignedState: user.assigned_state || user.hierarchy?.assignedState,
        assignedCity: user.assigned_city || user.hierarchy?.assignedCity,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by state:', error);
    return [];
  }
};

// Get users by city (for City Managers - role 5)
export const getUsersByCity = async (city: string) => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    if (!city) {
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('city', city);

    if (error) {
      console.error('Error fetching users by city:', error);
      return [];
    }

    console.log(`getUsersByCity found ${data?.length || 0} users for city:`, city);

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      const hierarchy = {
        zone: user.zone || user.hierarchy?.zone,
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.center || user.hierarchy?.center,
        centerId: user.center_id || user.hierarchy?.centerId,
        counselor: user.counselor || user.hierarchy?.counselor,
        brahmachariCounselor: user.brahmachari_counselor || user.hierarchy?.brahmachariCounselor,
        brahmachariCounselorEmail: user.brahmachari_counselor_email || user.hierarchy?.brahmachariCounselorEmail,
        grihasthaCounselor: user.grihastha_counselor || user.hierarchy?.grihasthaCounselor,
        grihasthaCounselorEmail: user.grihastha_counselor_email || user.hierarchy?.grihasthaCounselorEmail,
        assignedZone: user.assigned_zone || user.hierarchy?.assignedZone,
        assignedState: user.assigned_state || user.hierarchy?.assignedState,
        assignedCity: user.assigned_city || user.hierarchy?.assignedCity,
        // Spiritual fields
        initiationStatus: user.initiation_status || user.hierarchy?.initiationStatus,
        initiatedName: user.initiated_name || user.hierarchy?.initiatedName,
        spiritualMasterName: user.spiritual_master_name || user.hierarchy?.spiritualMasterName,
        aspiringSpiritualMasterName: user.aspiring_spiritual_master_name || user.hierarchy?.aspiringSpiritualMasterName,
        chantingSince: user.chanting_since || user.hierarchy?.chantingSince,
        rounds: user.rounds || user.hierarchy?.rounds,
        ashram: user.ashram || user.hierarchy?.ashram,
        royalMember: user.royal_member || user.hierarchy?.royalMember,
        introducedToKcIn: user.introduced_to_kc_in || user.hierarchy?.introducedToKcIn,
        parentTemple: user.parent_temple || user.hierarchy?.parentTemple,
        parentCenter: user.parent_center || user.hierarchy?.parentCenter,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        currentCenter: user.current_center || user.hierarchy?.currentCenter,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status || 'approved',
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        campDys: user.camp_dys || false,
        campSankalpa: user.camp_sankalpa || false,
        campSphurti: user.camp_sphurti || false,
        campUtkarsh: user.camp_utkarsh || false,
        campFaithAndDoubt: user.camp_faith_and_doubt || false,
        campSrcgdWorkshop: user.camp_srcgd_workshop || false,
        campNistha: user.camp_nistha || false,
        campAshray: user.camp_ashray || false,
        education: (() => {
          const eduArray: EducationEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const inst = user[`edu_${i}_institution` as keyof typeof user] as string | undefined;
            const field = user[`edu_${i}_field` as keyof typeof user] as string | undefined;
            const year = user[`edu_${i}_year` as keyof typeof user] as number | undefined;
            if (inst || field) {
              eduArray.push({
                institution: inst || '',
                field: field || '',
                year: year || null,
              });
            }
          }
          return eduArray.length > 0 ? eduArray : undefined;
        })(),
        workExperience: (() => {
          const workArray: WorkExperienceEntry[] = [];
          for (let i = 1; i <= 5; i++) {
            const company = user[`work_${i}_company` as keyof typeof user] as string | undefined;
            const position = user[`work_${i}_position` as keyof typeof user] as string | undefined;
            const startDate = user[`work_${i}_start_date` as keyof typeof user] as string | undefined;
            const endDate = user[`work_${i}_end_date` as keyof typeof user] as string | undefined;
            const current = user[`work_${i}_current` as keyof typeof user] as boolean | undefined;
            if (company || position) {
              workArray.push({
                company: company || '',
                position: position || '',
                startDate: startDate || null,
                endDate: endDate || null,
                current: current || false,
              });
            }
          }
          return workArray.length > 0 ? workArray : undefined;
        })(),
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching users by city:', error);
    return [];
  }
};

// Get pending users for approval
export const getPendingUsers = async () => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_status', 'pending');

    if (error) {
      console.error('Error fetching pending users:', error);
      return [];
    }

    return (data || []).map((user: any) => {
      const normalizedRole = normalizeRoleFromFirestore(user.role);

      // Basic hierarchy mapping
      const hierarchy = {
        state: user.state || user.hierarchy?.state,
        city: user.city || user.hierarchy?.city,
        center: user.current_center || user.center || user.hierarchy?.center, // Prefer current_center
        otherCenter: user.other_center || user.hierarchy?.otherCenter,
        otherTemple: user.other_temple || user.hierarchy?.otherTemple,
        ashram: user.ashram || user.hierarchy?.ashram,
        currentTemple: user.current_temple || user.hierarchy?.currentTemple,
        counselor: user.counselor || user.hierarchy?.counselor || user.brahmachari_counselor || user.grihastha_counselor || user.other_counselor,
        otherCounselor: user.other_counselor || user.hierarchy?.otherCounselor,
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        verificationStatus: user.verification_status,
        role: normalizedRole,
        phone: user.phone,
        profileImage: user.profile_image,
        birthDate: user.birth_date,
        pushTokens: user.push_tokens || [],
        hierarchy: hierarchy,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at),
      } as User;
    });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return [];
  }
};
// Get users for dropdowns (minimal data)
export const getUsersForDropdown = async () => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name');

    if (error) {
      console.error('Error fetching users for dropdown:', error);
      return [];
    }

    return (data || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email
    }));
  } catch (error) {
    console.error('Error fetching users for dropdown:', error);
    return [];
  }
};
