// Supabase functions for centers management
import { supabase } from './config';

export interface CenterData {
  id: string;
  name: string;
  state: string;
  city: string;
  temple_id?: string;
  temple_name?: string;
  address?: string;
  contact?: string;
  project_manager_id?: string;
  project_manager_name?: string;
  project_advisor_id?: string;
  project_advisor_name?: string;
  acting_manager_id?: string;
  acting_manager_name?: string;
  internal_manager_id?: string;
  internal_manager_name?: string;
  preaching_coordinator_id?: string;
  preaching_coordinator_name?: string;
  morning_program_in_charge_id?: string;
  morning_program_in_charge_name?: string;
  mentor_id?: string;
  mentor_name?: string;
  frontliner_id?: string;
  frontliner_name?: string;
  accountant_id?: string;
  accountant_name?: string;
  kitchen_head_id?: string;
  kitchen_head_name?: string;
  study_in_charge_id?: string;
  study_in_charge_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Get all centers from Supabase
export const getCentersFromSupabase = async (): Promise<CenterData[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .order('state')
      .order('city')
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error getting centers from Supabase:', error);
    throw new Error(error.message || 'Failed to get centers');
  }
};

// Get centers by location from Supabase
export const getCentersByLocationFromSupabase = async (
  state?: string,
  city?: string
): Promise<CenterData[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    let query = supabase
      .from('centers')
      .select('*');

    if (state) {
      query = query.eq('state', state);
    }

    if (city) {
      query = query.eq('city', city);
    }

    const { data, error } = await query
      .order('state')
      .order('city')
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error getting centers by location from Supabase:', error);
    throw new Error(error.message || 'Failed to get centers by location');
  }
};

// Get centers by temple from Supabase
export const getCentersByTempleFromSupabase = async (
  templeId: string
): Promise<CenterData[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .eq('temple_id', templeId)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error: any) {
    console.error('Error getting centers by temple from Supabase:', error);
    throw new Error(error.message || 'Failed to get centers by temple');
  }
};

// Add a center to Supabase
export const addCenterToSupabase = async (
  center: Omit<CenterData, 'id' | 'created_at' | 'updated_at'>
): Promise<boolean> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Check if center already exists
    const { data: existing, error: checkError } = await supabase
      .from('centers')
      .select('id')
      .eq('state', center.state.trim())
      .eq('city', center.city.trim())
      .eq('name', center.name.trim())
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result

    // If there's an error other than "not found", log it
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking if center exists:', checkError);
    }

    if (existing) {
      // Center already exists, return true (not an error)
      return true;
    }

    // Insert new center
    const { error } = await supabase
      .from('centers')
      .insert({
        name: center.name.trim(),
        state: center.state.trim(),
        city: center.city.trim(),
        address: center.address?.trim() || null,
        contact: center.contact?.trim() || null,
      });

    if (error) {
      // Check if it's a unique constraint violation (duplicate)
      if (error.code === '23505') {
        // Center already exists (race condition), return true
        return true;
      }
      throw new Error(error.message);
    }

    return true;
  } catch (error: any) {
    console.error('Error adding center to Supabase:', error);
    throw new Error(error.message || 'Failed to add center');
  }
};

// Delete a center from Supabase
export const deleteCenterFromSupabase = async (centerId: string): Promise<boolean> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { error } = await supabase
      .from('centers')
      .delete()
      .eq('id', centerId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting center from Supabase:', error);
    throw new Error(error.message || 'Failed to delete center');
  }
};

// Bulk add centers to Supabase
export const addCentersBulkToSupabase = async (
  centers: Array<Omit<CenterData, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: number; errors: number; errorsList: Array<{ center: string; error: string }> }> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  let success = 0;
  let errors = 0;
  const errorsList: Array<{ center: string; error: string }> = [];

  // Process in batches of 100 to avoid overwhelming the database
  const batchSize = 100;

  for (let i = 0; i < centers.length; i += batchSize) {
    const batch = centers.slice(i, i + batchSize);

    // Prepare batch for insert (deduplicate within batch first)
    const uniqueBatch = Array.from(
      new Map(batch.map(c => [`${c.state}:${c.city}:${c.name}`, c])).values()
    );

    try {
      // Use upsert to handle duplicates gracefully
      const { error: batchError } = await supabase
        .from('centers')
        .upsert(
          uniqueBatch.map(c => ({
            name: c.name.trim(),
            state: c.state.trim(),
            city: c.city.trim(),
            address: c.address?.trim() || null,
            contact: c.contact?.trim() || null,
          })),
          {
            onConflict: 'state,city,name', // Use the unique constraint
            ignoreDuplicates: true, // Don't throw error on duplicates
          }
        );

      if (batchError) {
        // If batch insert fails, try individual inserts
        for (const center of uniqueBatch) {
          try {
            await addCenterToSupabase(center);
            success++;
          } catch (err: any) {
            errors++;
            errorsList.push({ center: `${center.state} - ${center.city} - ${center.name}`, error: err.message });
          }
        }
      } else {
        success += uniqueBatch.length;
      }
    } catch (error: any) {
      // If batch fails, try individual inserts
      for (const center of uniqueBatch) {
        try {
          await addCenterToSupabase(center);
          success++;
        } catch (err: any) {
          errors++;
          errorsList.push({ center: `${center.state} - ${center.city} - ${center.name}`, error: err.message });
        }
      }
    }
  }

  return { success, errors, errorsList };
};
