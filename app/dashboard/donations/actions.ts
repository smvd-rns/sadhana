'use server';

import { getSadhanaAdminClient } from '@/lib/supabase/sadhanaDb';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * Fetches donations for a specific user, bypassing RLS via service role.
 */
export async function fetchUserDonations(userId: string, accessToken?: string) {
  try {
    const supabase = createServerClient();
    
    // Verify the requesting user is who they say they are
    if (!accessToken) throw new Error('Unauthorized: Missing access token.');
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user || user.id !== userId) {
      throw new Error('Unauthorized');
    }

    // Use admin client to bypass RLS, but filter to only this user's donations
    const admin = getSadhanaAdminClient();
    const { data, error: donationsError } = await admin
      .from('donations')
      .select('*')
      .eq('tag_user_id', userId)
      .order('created_at', { ascending: false });

    if (donationsError) throw new Error(donationsError.message);

    return { success: true, donations: data };
  } catch (err: any) {
    console.error('fetchUserDonations error:', err);
    return { success: false, error: err.message };
  }
}
