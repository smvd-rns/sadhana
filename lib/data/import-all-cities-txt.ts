/**
 * Import cities from all city.txt JSON file
 */

import { addCityToLocal } from '@/lib/data/local-cities';

export interface ImportResult {
  success: number;
  skipped: number;
  errors: number;
  details: {
    errors: Array<{ city: string; state: string; error: string }>;
  };
}

/**
 * Parse the all cities JSON file
 */
export async function parseAllCitiesTxt(): Promise<Record<string, string[]>> {
  try {
    // Try to fetch from public folder
    const response = await fetch('/all-cities.json');
    if (!response.ok) {
      throw new Error('Failed to fetch all-cities.json file. Make sure the file is in the public folder.');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing all-cities.json:', error);
    throw error;
  }
}

/**
 * Import all cities from all city.txt file
 */
export async function importAllCitiesFromTxt(
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    skipped: 0,
    errors: 0,
    details: {
      errors: [],
    },
  };

  try {
    // Parse the JSON file
    const citiesData = await parseAllCitiesTxt();
    
    // Calculate total cities
    let totalCities = 0;
    for (const cities of Object.values(citiesData)) {
      totalCities += Array.isArray(cities) ? cities.length : 0;
    }

    let processed = 0;

    // Process each state
    for (const [state, cities] of Object.entries(citiesData)) {
      if (!Array.isArray(cities)) {
        continue;
      }

      for (const cityName of cities) {
        if (!cityName || typeof cityName !== 'string') {
          continue;
        }

        const cityNameTrimmed = cityName.trim();
        if (!cityNameTrimmed) {
          result.skipped++;
          processed++;
          if (onProgress) onProgress(processed, totalCities);
          continue;
        }

        try {
          // Add to Supabase via API
          const success = await addCityToLocal(state, cityNameTrimmed);
          if (success) {
            result.success++;
          } else {
            // If it fails, it might be a duplicate or other issue
            result.skipped++;
          }
        } catch (error: any) {
          result.errors++;
          result.details.errors.push({
            city: cityNameTrimmed,
            state: state,
            error: error.message || 'Unknown error',
          });
        }

        processed++;
        if (onProgress) {
          onProgress(processed, totalCities);
        }
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error importing cities from all city.txt:', error);
    throw error;
  }
}

/**
 * Get count of cities in all city.txt file
 */
export async function getAllCitiesTxtCount(): Promise<number> {
  try {
    const citiesData = await parseAllCitiesTxt();
    let count = 0;
    for (const cities of Object.values(citiesData)) {
      count += Array.isArray(cities) ? cities.length : 0;
    }
    return count;
  } catch (error) {
    console.error('Error counting cities:', error);
    return 0;
  }
}
