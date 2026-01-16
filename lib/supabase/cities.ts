// Supabase functions for cities management
import { supabase } from './config';

export interface CityData {
  id: string;
  name: string;
  state: string;
  created_at?: string;
  updated_at?: string;
}

export interface CitiesData {
  [state: string]: string[]; // State name -> array of city names
}

// Get all cities from Supabase
export const getCitiesFromSupabase = async (): Promise<CitiesData> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('state')
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    // Convert to CitiesData format (state -> cities array)
    const citiesData: CitiesData = {};
    
    if (data) {
      data.forEach((city: CityData) => {
        if (!citiesData[city.state]) {
          citiesData[city.state] = [];
        }
        if (!citiesData[city.state].includes(city.name)) {
          citiesData[city.state].push(city.name);
        }
      });
    }

    return citiesData;
  } catch (error: any) {
    console.error('Error getting cities from Supabase:', error);
    throw new Error(error.message || 'Failed to get cities');
  }
};

// Get cities for a specific state from Supabase
export const getCitiesByStateFromSupabase = async (state: string): Promise<string[]> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { data, error } = await supabase
      .from('cities')
      .select('name')
      .eq('state', state)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    return data?.map((city: { name: string }) => city.name) || [];
  } catch (error: any) {
    console.error('Error getting cities by state from Supabase:', error);
    throw new Error(error.message || 'Failed to get cities by state');
  }
};

// Add a city to Supabase
export const addCityToSupabase = async (state: string, cityName: string): Promise<boolean> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    // Check if city already exists
    const { data: existing, error: checkError } = await supabase
      .from('cities')
      .select('id')
      .eq('state', state)
      .eq('name', cityName.trim())
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no result

    // If there's an error, handle it
    if (checkError) {
      // PGRST116 is "not found" which is fine
      // Other errors indicate a problem (table doesn't exist, permissions, etc.)
      if (checkError.code !== 'PGRST116') {
        console.error('Error checking if city exists:', checkError);
        // If it's a "table doesn't exist" error, throw a more helpful error
        if (checkError.message?.includes('does not exist') || checkError.code === '42P01') {
          throw new Error('Cities table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
        }
        // If it's a permissions error, throw a helpful error
        if (checkError.code === '42501' || checkError.message?.includes('permission denied')) {
          throw new Error('Permission denied. Please check your Supabase RLS policies. Cities table should allow SELECT for all users.');
        }
        // For other errors, throw them as-is
        throw new Error(checkError.message || 'Failed to check if city exists');
      }
    }

    if (existing) {
      // City already exists, return true (not an error)
      return true;
    }

    // Insert new city
    const { error } = await supabase
      .from('cities')
      .insert({
        name: cityName.trim(),
        state: state.trim(),
      });

    if (error) {
      // Check if it's a unique constraint violation (duplicate)
      if (error.code === '23505') {
        // City already exists (race condition), return true
        return true;
      }
      // Log full error for debugging
      console.error('Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Provide helpful error messages based on error codes
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new Error('Cities table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies. Cities table should allow INSERT for authenticated users.');
      }
      
      throw new Error(error.message || `Failed to insert city: ${error.code || 'Unknown error'}`);
    }

    return true;
  } catch (error: any) {
    console.error('Error adding city to Supabase:', error);
    throw new Error(error.message || 'Failed to add city');
  }
};

// Delete a city from Supabase
export const deleteCityFromSupabase = async (state: string, cityName: string): Promise<boolean> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  try {
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('state', state)
      .eq('name', cityName);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error: any) {
    console.error('Error deleting city from Supabase:', error);
    throw new Error(error.message || 'Failed to delete city');
  }
};

// Bulk add cities to Supabase
export const addCitiesBulkToSupabase = async (
  cities: Array<{ state: string; name: string }>
): Promise<{ success: number; errors: number; errorsList: Array<{ city: string; error: string }> }> => {
  if (!supabase) {
    throw new Error('Supabase is not initialized');
  }

  let success = 0;
  let errors = 0;
  const errorsList: Array<{ city: string; error: string }> = [];

  // Process in batches of 100 to avoid overwhelming the database
  const batchSize = 100;
  
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    
    // Prepare batch for insert (deduplicate within batch first)
    const uniqueBatch = Array.from(
      new Map(batch.map(c => [`${c.state}:${c.name}`, c])).values()
    );

    try {
      // Use upsert to handle duplicates gracefully
      const { error: batchError } = await supabase
        .from('cities')
        .upsert(
          uniqueBatch.map(c => ({
            name: c.name.trim(),
            state: c.state.trim(),
          })),
          {
            onConflict: 'state,name', // Use the unique constraint
            ignoreDuplicates: true, // Don't throw error on duplicates
          }
        );

      if (batchError) {
        // If batch insert fails, try individual inserts
        for (const city of uniqueBatch) {
          try {
            await addCityToSupabase(city.state, city.name);
            success++;
          } catch (err: any) {
            errors++;
            errorsList.push({ city: `${city.state} - ${city.name}`, error: err.message });
          }
        }
      } else {
        success += uniqueBatch.length;
      }
    } catch (error: any) {
      // If batch fails, try individual inserts
      for (const city of uniqueBatch) {
        try {
          await addCityToSupabase(city.state, city.name);
          success++;
        } catch (err: any) {
          errors++;
          errorsList.push({ city: `${city.state} - ${city.name}`, error: err.message });
        }
      }
    }
  }

  return { success, errors, errorsList };
};
