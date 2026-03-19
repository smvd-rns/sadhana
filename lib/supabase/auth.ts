import { supabase } from './config';
import { User, UserRole, EducationEntry, WorkExperienceEntry, LanguageEntry, SkillEntry, ServiceEntry } from '@/types';
import { roleToNumber, normalizeRoleFromFirestore } from '@/lib/utils/roles';
import { enrichHierarchyData } from './hierarchy-helpers';

export const signUp = async (
  email: string,
  password: string,
  name: string,
  role: UserRole | UserRole[],
  hierarchy: any,
  profileImage?: string
) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password length (Supabase requires at least 6 characters)
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
        },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    if (authError) {
      console.error('Supabase signup error:', authError);
      // Provide more user-friendly error messages
      if (authError.message.includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      } else if (authError.message.includes('password')) {
        throw new Error('Password does not meet requirements. Please use a stronger password.');
      } else if (authError.message.includes('email')) {
        throw new Error('Invalid email address. Please check and try again.');
      }
      throw new Error(authError.message || 'Failed to create account');
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    // Ensure role is always an array
    const rolesArray = Array.isArray(role) ? role : [role];

    // Convert roles to numbers for database storage
    const roleNumbers = roleToNumber(rolesArray);

    // Ensure hierarchy is a proper object (not null/undefined)
    let hierarchyData = hierarchy && typeof hierarchy === 'object' ? hierarchy : {};

    console.log('Original hierarchy data before enrichment:', JSON.stringify(hierarchyData, null, 2));

    // Enrich hierarchy data with missing counselor emails and center_id from database
    hierarchyData = await enrichHierarchyData(hierarchyData);

    console.log('Enriched hierarchy data after enrichment:', JSON.stringify(hierarchyData, null, 2));
    console.log('User ID:', authData.user.id);

    // Extract hierarchy fields for separate columns
    const state = hierarchyData?.state || null;
    const city = hierarchyData?.city || null;
    const center = hierarchyData?.center || null;
    const centerId = hierarchyData?.centerId || null; // Center ID for accurate matching

    // Extract spiritual fields for separate columns
    const initiationStatus = hierarchyData?.initiationStatus || null;
    const initiatedName = hierarchyData?.initiatedName || null;
    const spiritualMasterName = hierarchyData?.spiritualMasterName || null;
    const aspiringSpiritualMasterName = hierarchyData?.aspiringSpiritualMasterName || null;
    const chantingSince = hierarchyData?.chantingSince || null;
    const rounds = hierarchyData?.rounds ? parseInt(hierarchyData.rounds) || null : null;
    const ashram = hierarchyData?.ashram || null;
    const royalMember = hierarchyData?.royalMember || null;
    const brahmachariCounselor = hierarchyData?.brahmachariCounselor || null;
    const brahmachariCounselorEmail = hierarchyData?.brahmachariCounselorEmail || null;
    const grihasthaCounselor = hierarchyData?.grihasthaCounselor || null;
    const grihasthaCounselorEmail = hierarchyData?.grihasthaCounselorEmail || null;

    // Create user record in users table
    const { data: insertedData, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: roleNumbers, // Save as array of numbers
        verification_status: 'unverified', // Default to unverified, allows access to complete-profile
        profile_image: profileImage || null, // Google Drive photo link
        state: state,
        city: city,
        center: center,
        center_id: centerId, // Store center ID for accurate matching
        // Spiritual information columns
        initiation_status: initiationStatus,
        initiated_name: initiatedName,
        spiritual_master_name: spiritualMasterName,
        aspiring_spiritual_master_name: aspiringSpiritualMasterName,
        chanting_since: chantingSince || null,
        rounds: rounds,
        ashram: ashram,
        royal_member: royalMember,
        brahmachari_counselor: brahmachariCounselor,
        brahmachari_counselor_email: brahmachariCounselorEmail,
        grihastha_counselor: grihasthaCounselor,
        grihastha_counselor_email: grihasthaCounselorEmail,
        hierarchy: hierarchyData, // Keep for backward compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, profile_image, state, city, center, initiation_status, ashram, brahmachari_counselor, grihastha_counselor');

    console.log('User creation result:', { insertedData, dbError });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // If user creation fails, the auth user will remain but without a profile
      // You may want to clean this up manually or via a server-side function
      if (dbError.code === '23505') {
        throw new Error('User already exists. Please sign in instead.');
      }
      throw new Error(dbError.message || 'Failed to create user profile');
    }

    return authData.user;
  } catch (error: any) {
    console.error('Signup error:', error);
    throw new Error(error.message || 'Failed to sign up. Please try again.');
  }
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
};

export const logout = async () => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to logout');
  }
};

export const getCurrentUser = async () => {
  if (!supabase) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const transformUserProfile = (data: any): User => {
  // Convert role numbers back to role names
  const normalizedRole = normalizeRoleFromFirestore(data.role);

  // Build hierarchy object from separate columns (preferred) or JSONB (fallback)
  const hierarchy = {
    state: data.state || data.hierarchy?.state,
    city: data.city || data.hierarchy?.city,
    center: data.center || data.hierarchy?.center,
    centerId: data.center_id || data.hierarchy?.centerId,
    // Spiritual fields from separate columns
    initiationStatus: data.initiation_status || data.hierarchy?.initiationStatus,
    initiatedName: data.initiated_name || data.hierarchy?.initiatedName,
    spiritualMasterName: data.spiritual_master_name || data.hierarchy?.spiritualMasterName,
    aspiringSpiritualMasterName: data.aspiring_spiritual_master_name || data.hierarchy?.aspiringSpiritualMasterName,
    chantingSince: data.chanting_since || data.hierarchy?.chantingSince,
    rounds: data.rounds?.toString() || data.hierarchy?.rounds,
    ashram: data.ashram || data.hierarchy?.ashram,
    counselor: data.counselor || data.hierarchy?.counselor,
    counselorId: data.counselor_id || data.hierarchy?.counselorId,
    royalMember: data.royal_member || data.hierarchy?.royalMember,
    introducedToKcIn: data.introduced_to_kc_in || data.hierarchy?.introducedToKcIn,
    parentTemple: data.parent_temple || data.hierarchy?.parentTemple,
    otherParentTemple: data.other_parent_temple || data.hierarchy?.otherParentTemple,
    parentCenter: data.parent_center || data.hierarchy?.parentCenter,
    currentTemple: data.current_temple || data.hierarchy?.currentTemple,
    currentCenter: data.current_center || data.hierarchy?.currentCenter,
    brahmachariCounselor: data.brahmachari_counselor || data.hierarchy?.brahmachariCounselor,
    brahmachariCounselorEmail: data.brahmachari_counselor_email || data.hierarchy?.brahmachariCounselorEmail,
    grihasthaCounselor: data.grihastha_counselor || data.hierarchy?.grihasthaCounselor,
    grihasthaCounselorEmail: data.grihastha_counselor_email || data.hierarchy?.grihasthaCounselorEmail,
    otherCounselor: data.other_counselor || data.hierarchy?.otherCounselor,
    otherCenter: data.other_center || data.hierarchy?.otherCenter,
    otherParentCenter: data.other_parent_center || data.hierarchy?.otherParentCenter,
    // Assigned geographic areas for manager roles
    assignedZone: data.assigned_zone || data.hierarchy?.assignedZone,
    assignedState: data.assigned_state || data.hierarchy?.assignedState,
    assignedCity: data.assigned_city || data.hierarchy?.assignedCity,
  };

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    verificationStatus: data.verification_status, // Map from DB column
    rejectionReason: data.rejection_reason,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    role: normalizedRole,
    phone: data.phone,
    profileImage: data.profile_image, // Google Drive photo link
    birthDate: data.birth_date,
    hierarchy: hierarchy,
    // Relative contact fields
    relative1Name: data.relative_1_name,
    relative1Relationship: data.relative_1_relationship,
    relative1Phone: data.relative_1_phone,
    relative2Name: data.relative_2_name,
    relative2Relationship: data.relative_2_relationship,
    relative2Phone: data.relative_2_phone,
    relative3Name: data.relative_3_name,
    relative3Relationship: data.relative_3_relationship,
    relative3Phone: data.relative_3_phone,
    // Health fields
    healthChronicDisease: data.health_chronic_disease,
    parentTemple: data.parent_temple || data.hierarchy?.parentTemple,
    otherParentTemple: data.other_parent_temple || data.hierarchy?.otherParentTemple,
    introducedToKcIn: data.introduced_to_kc_in || data.hierarchy?.introducedToKcIn,
    // Camp completion fields
    campDys: data.camp_dys || false,
    campSankalpa: data.camp_sankalpa || false,
    campSphurti: data.camp_sphurti || false,
    campUtkarsh: data.camp_utkarsh || false,
    campFaithAndDoubt: data.camp_faith_and_doubt || false,
    campSrcgdWorkshop: data.camp_srcgd_workshop || false,
    campNistha: data.camp_nistha || false,
    campAshray: data.camp_ashray || false,
    // SP Books Study Course fields (Third Semester)
    spbookThirdSsr15: data.spbook_third_ssr_1_5 || false,
    spbookThirdComingBack: data.spbook_third_coming_back || false,
    spbookThirdPqpa: data.spbook_third_pqpa || false,
    spbookThirdMatchlessGift: data.spbook_third_matchless_gift || false,
    spbookThirdRajaVidya: data.spbook_third_raja_vidya || false,
    spbookThirdElevationKc: data.spbook_third_elevation_kc || false,
    spbookThirdBeyondBirthDeath: data.spbook_third_beyond_birth_death || false,
    spbookThirdKrishnaReservoir: data.spbook_third_krishna_reservoir || false,
    // SP Books Study Course fields (Fourth Semester)
    spbookFourthSsr68: data.spbook_fourth_ssr_6_8 || false,
    spbookFourthLawsOfNature: data.spbook_fourth_laws_of_nature || false,
    spbookFourthDharma: data.spbook_fourth_dharma || false,
    spbookFourthSecondChance: data.spbook_fourth_second_chance || false,
    spbookFourthIsopanishad110: data.spbook_fourth_isopanishad_1_10 || false,
    spbookFourthQueenKuntiVideo: data.spbook_fourth_queen_kunti_video || false,
    spbookFourthEnlightenmentNatural: data.spbook_fourth_enlightenment_natural || false,
    spbookFourthKrishnaBook121: data.spbook_fourth_krishna_book_1_21 || false,
    // SP Books Study Course fields (Fifth Semester)
    spbookFifthLifeFromLife: data.spbook_fifth_life_from_life || false,
    spbookFifthPrahladTeachings: data.spbook_fifth_prahlad_teachings || false,
    spbookFifthJourneySelfDiscovery: data.spbook_fifth_journey_self_discovery || false,
    spbookFifthQueenKuntiHearing: data.spbook_fifth_queen_kunti_hearing || false,
    spbookFifthLordKapila: data.spbook_fifth_lord_kapila || false,
    spbookFifthNectar16: data.spbook_fifth_nectar_1_6 || false,
    spbookFifthGita16: data.spbook_fifth_gita_1_6 || false,
    spbookFifthKrishnaBook2428: data.spbook_fifth_krishna_book_24_28 || false,
    // SP Books Study Course fields (Sixth Semester)
    spbookSixthNectar711: data.spbook_sixth_nectar_7_11 || false,
    spbookSixthPathPerfection: data.spbook_sixth_path_perfection || false,
    spbookSixthCivilisationTranscendence: data.spbook_sixth_civilisation_transcendence || false,
    spbookSixthHareKrishnaChallenge: data.spbook_sixth_hare_krishna_challenge || false,
    spbookSixthGita712: data.spbook_sixth_gita_7_12 || false,
    spbookSixthSb1stCanto16: data.spbook_sixth_sb_1st_canto_1_6 || false,
    spbookSixthKrishnaBook3559: data.spbook_sixth_krishna_book_35_59 || false,
    // SP Books Study Course fields (Seventh Semester)
    spbookSeventhGita1318: data.spbook_seventh_gita_13_18 || false,
    spbookSeventhSb1stCanto713: data.spbook_seventh_sb_1st_canto_7_13 || false,
    spbookSeventhKrishnaBook6378: data.spbook_seventh_krishna_book_63_78 || false,
    // SP Books Study Course fields (Eighth Semester)
    spbookEighthSb1stCanto1419: data.spbook_eighth_sb_1st_canto_14_19 || false,
    spbookEighthKrishnaBook7889: data.spbook_eighth_krishna_book_78_89 || false,
    // Education fields (build array from separate columns)
    education: (() => {
      const eduArray: EducationEntry[] = [];
      for (let i = 1; i <= 5; i++) {
        const inst = data[`edu_${i}_institution` as keyof typeof data] as string | undefined;
        const field = data[`edu_${i}_field` as keyof typeof data] as string | undefined;
        const year = data[`edu_${i}_year` as keyof typeof data] as number | undefined;
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
        const company = data[`work_${i}_company` as keyof typeof data] as string | undefined;
        const position = data[`work_${i}_position` as keyof typeof data] as string | undefined;
        const startDate = data[`work_${i}_start_date` as keyof typeof data] as string | undefined;
        const endDate = data[`work_${i}_end_date` as keyof typeof data] as string | undefined;
        const current = data[`work_${i}_current` as keyof typeof data] as boolean | undefined;
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
    // Language fields (build array from separate columns)
    languages: (() => {
      const langArray: LanguageEntry[] = [];
      for (let i = 1; i <= 5; i++) {
        const name = data[`language_${i}` as keyof typeof data] as string | undefined;
        if (name && name.trim()) {
          langArray.push({ name: name.trim() });
        }
      }
      return langArray.length > 0 ? langArray : undefined;
    })(),
    // Skills fields (build array from separate columns)
    skills: (() => {
      const skillArray: SkillEntry[] = [];
      for (let i = 1; i <= 5; i++) {
        const name = data[`skill_${i}` as keyof typeof data] as string | undefined;
        if (name && name.trim()) {
          skillArray.push({ name: name.trim() });
        }
      }
      return skillArray.length > 0 ? skillArray : undefined;
    })(),
    // Services rendered fields (build array from separate columns)
    services: (() => {
      const serviceArray: ServiceEntry[] = [];
      for (let i = 1; i <= 5; i++) {
        const name = data[`service_${i}` as keyof typeof data] as string | undefined;
        if (name && name.trim()) {
          serviceArray.push({ name: name.trim() });
        }
      }
      return serviceArray.length > 0 ? serviceArray : undefined;
    })(),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  } as User;
};

export const getUserData = async (userId: string): Promise<User | null> => {
  if (!supabase) {
    console.error('Supabase is not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result

    if (error) {
      console.error('Error fetching user data:', error);
      return null;
    }

    if (!data) {
      return null; // User not found
    }

    return transformUserProfile(data);

  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

// Reset password (forgot password)
export const resetPassword = async (email: string) => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    // Check if user exists in the users table first
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // Database error, but continue anyway
        console.warn('Error checking user existence:', checkError);
      } else if (!existingUser) {
        // User doesn't exist in our database
        throw new Error('No account found with this email address. Please check your email or register for a new account.');
      }
    } catch (checkError: any) {
      // If it's our custom error about user not found, throw it
      if (checkError.message?.includes('No account found')) {
        throw checkError;
      }
      // Otherwise, re-throw the error
      throw checkError;
    }

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      // Provide user-friendly error messages
      if (error.message?.toLowerCase().includes('user not found') ||
        error.message?.toLowerCase().includes('no user found')) {
        throw new Error('No account found with this email address. Please check your email or register for a new account.');
      }
      throw new Error(error.message || 'Failed to send password reset email');
    }

    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

// Sign in with Google OAuth
export const signInWithGoogle = async () => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('OAuth error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Sign in with Google error:', error);
    throw error;
  }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) {
    return {
      data: {
        subscription: {
          unsubscribe: () => { },
        },
      },
    };
  }

  // Supabase's onAuthStateChange returns { data: { subscription: ... } }
  const result = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  // Return the result directly (it already has the correct structure)
  return result;
};
