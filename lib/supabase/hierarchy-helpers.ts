import { supabase } from './config';

/**
 * Helper function to fetch counselor email from counselors table by counselor name
 * Uses EXACT name match only - no ashram filtering since dropdown already filters by ashram
 */
export async function fetchCounselorEmail(counselorName: string): Promise<string | null> {
  if (!supabase || !counselorName) {
    return null;
  }

  try {
    const s = supabase;
    // Exact match by name only - no ashram filter needed since dropdown already filters
    const { data, error } = await s
      .from('counselors')
      .select('email')
      .eq('name', counselorName.trim())
      .maybeSingle();

    if (error) {
      console.error('Error fetching counselor email:', error);
      return null;
    }

    if (data?.email) {
      console.log(`Found email for counselor "${counselorName.trim()}":`, data.email);
      return data.email;
    }

    console.warn(`No email found for counselor: "${counselorName.trim()}"`);
    return null;
  } catch (error) {
    console.error('Error fetching counselor email:', error);
    return null;
  }
}

/**
 * Helper function to fetch center_id from centers table by center name, state, and city
 */
export async function fetchCenterId(centerName: string, state?: string, city?: string): Promise<string | null> {
  if (!supabase || !centerName) {
    return null;
  }

  try {
    const s = supabase;
    let query = s
      .from('centers')
      .select('id')
      .eq('name', centerName.trim())
      .maybeSingle();

    // If state is provided, filter by state
    if (state) {
      query = supabase
        .from('centers')
        .select('id')
        .eq('name', centerName.trim())
        .eq('state', state.trim())
        .maybeSingle();
    }

    // If both state and city are provided, filter by both
    if (state && city) {
      query = supabase
        .from('centers')
        .select('id')
        .eq('name', centerName.trim())
        .eq('state', state.trim())
        .eq('city', city.trim())
        .maybeSingle();
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching center_id:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error fetching center_id:', error);
    return null;
  }
}

/**
 * Helper function to enrich hierarchy data with missing counselor emails and center_id
 * This function ALWAYS fetches emails from the counselors table when counselor names are provided,
 * ensuring the emails are always up-to-date from the database.
 */
export async function enrichHierarchyData(hierarchyData: any): Promise<any> {
  const enriched = { ...hierarchyData };

  console.log('Starting hierarchy enrichment. Input data:', {
    brahmachariCounselor: enriched.brahmachariCounselor,
    brahmachariCounselorEmail: enriched.brahmachariCounselorEmail,
    grihasthaCounselor: enriched.grihasthaCounselor,
    grihasthaCounselorEmail: enriched.grihasthaCounselorEmail,
    center: enriched.center,
    centerId: enriched.centerId,
  });

  // ALWAYS fetch brahmachari counselor email from database if counselor name is provided
  // Exact match by name only - no ashram filter since dropdown already filters
  if (enriched.brahmachariCounselor && enriched.brahmachariCounselor.trim() !== '') {
    const counselorName = enriched.brahmachariCounselor.trim();
    console.log('Fetching brahmachari counselor email for exact name match:', counselorName);
    const email = await fetchCounselorEmail(counselorName);
    if (email) {
      enriched.brahmachariCounselorEmail = email;
      console.log('✅ Found and set brahmachari counselor email:', email);
    } else {
      console.warn('⚠️ Could not find brahmachari counselor email for:', counselorName);
      enriched.brahmachariCounselorEmail = null;
    }
  }

  // ALWAYS fetch grihastha counselor email from database if counselor name is provided
  if (enriched.grihasthaCounselor && enriched.grihasthaCounselor.trim() !== '') {
    const counselorName = enriched.grihasthaCounselor.trim();
    console.log('Fetching grihastha counselor email for exact name match:', counselorName);
    const email = await fetchCounselorEmail(counselorName);
    if (email) {
      enriched.grihasthaCounselorEmail = email;
      console.log('✅ Found and set grihastha counselor email:', email);
    } else {
      console.warn('⚠️ Could not find grihastha counselor email for:', counselorName);
      enriched.grihasthaCounselorEmail = null;
    }
  }

  // Handle unified counselor field
  if (enriched.counselor && enriched.counselor !== 'Other' && enriched.counselor !== 'None') {
    const counselorName = enriched.counselor.trim();
    console.log('Fetching unified counselor details for:', counselorName);

    // Fetch counselor details by name
    const { data: cData } = await supabase
      .from('counselors')
      .select('id, email')
      .eq('name', counselorName)
      .maybeSingle();

    if (cData) {
      if (!enriched.counselorId) enriched.counselorId = cData.id;
      enriched.counselorEmail = cData.email;
      console.log('✅ Found and set unified counselor details:', cData);
    }
  }

  // ALWAYS fetch center_id when center name is provided to ensure it stays in sync
  // This is important when users change their center - we need to update the center_id to match
  if (enriched.center && enriched.center.trim() !== '' && supabase) {
    console.log('Fetching center_id for:', enriched.center);
    const centerId = await fetchCenterId(enriched.center.trim(), enriched.state, enriched.city);
    if (centerId) {
      enriched.centerId = centerId;
      console.log('✅ Found and set center_id:', centerId);
    } else {
      console.warn('⚠️ Could not find center_id for:', enriched.center);
      // If center name is provided but we can't find the ID, set it to null
      // This prevents keeping an old/incorrect center_id
      enriched.centerId = null;
    }
  }

  console.log('Completed hierarchy enrichment. Output data:', {
    brahmachariCounselor: enriched.brahmachariCounselor,
    brahmachariCounselorEmail: enriched.brahmachariCounselorEmail,
    grihasthaCounselor: enriched.grihasthaCounselor,
    grihasthaCounselorEmail: enriched.grihasthaCounselorEmail,
    center: enriched.center,
    centerId: enriched.centerId,
  });

  return enriched;
}
