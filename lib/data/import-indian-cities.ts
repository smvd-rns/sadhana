// Import Indian cities from world_cities_full.js extraction
// Maps cities to states and imports them into Firebase

import { addCityToLocal } from '@/lib/data/local-cities';
import { matchCityToState } from './city-state-mapper';

export interface ImportResult {
  success: number;
  skipped: number;
  errors: number;
  unmapped: number;
  details: {
    mapped: Array<{ city: string; state: string }>;
    unmapped: string[];
    errors: Array<{ city: string; error: string }>;
  };
}

/**
 * Import all Indian cities from extracted JSON file
 * Cities are matched to states where possible
 */
export const importAllIndianCities = async (
  onProgress?: (current: number, total: number, stats: { mapped: number; unmapped: number }) => void
): Promise<ImportResult> => {
  try {
    // Import extracted cities
    const extracted = await import('./indian-cities-extracted.json');
    const cities: string[] = extracted.cities || [];
    
    const result: ImportResult = {
      success: 0,
      skipped: 0,
      errors: 0,
      unmapped: 0,
      details: {
        mapped: [],
        unmapped: [],
        errors: []
      }
    };

    const total = cities.length;
    let processed = 0;
    let mappedCount = 0;
    let unmappedCount = 0;

    // Process cities in batches
    const batchSize = 50;

    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      
      for (const cityName of batch) {
        try {
          // Try to match city to state
          const match = matchCityToState(cityName);
          
          if (match) {
            // City has state mapping - import it to Supabase via API
            try {
              const success = await addCityToLocal(match.state, cityName);
              if (success) {
                result.success++;
                result.details.mapped.push({ city: cityName, state: match.state });
                mappedCount++;
              } else {
                result.skipped++;
              }
            } catch (error: any) {
              result.errors++;
              result.details.errors.push({ city: cityName, error: error.message });
            }
          } else {
            // No state mapping found - add to unmapped list
            result.unmapped++;
            result.details.unmapped.push(cityName);
            unmappedCount++;
          }
        } catch (error: any) {
          result.errors++;
          result.details.errors.push({ city: cityName, error: error.message });
        }
        
        processed++;
      }

      // Report progress
      if (onProgress) {
        onProgress(processed, total, { mapped: mappedCount, unmapped: unmappedCount });
      }

      // Small delay between batches
      if (i + batchSize < cities.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import cities: ${error.message}`);
  }
};

/**
 * Import only cities that can be mapped to states
 */
export const importMappedCitiesOnly = async (
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> => {
  try {
    const extracted = await import('./indian-cities-extracted.json');
    const cities: string[] = extracted.cities || [];
    
    const result: ImportResult = {
      success: 0,
      skipped: 0,
      errors: 0,
      unmapped: 0,
      details: {
        mapped: [],
        unmapped: [],
        errors: []
      }
    };

    // First, find all mappable cities
    const mappableCities: Array<{ city: string; state: string }> = [];
    
    for (const city of cities) {
      const match = matchCityToState(city);
      if (match) {
        mappableCities.push({ city, state: match.state });
      } else {
        result.details.unmapped.push(city);
        result.unmapped++;
      }
    }

    const total = mappableCities.length;
    let processed = 0;

    // Import mappable cities in batches
    const batchSize = 50;

    for (let i = 0; i < mappableCities.length; i += batchSize) {
      const batch = mappableCities.slice(i, i + batchSize);
      
      for (const { city, state } of batch) {
        try {
          // Add to Supabase via API
          const success = await addCityToLocal(state, city);
          if (success) {
            result.success++;
            result.details.mapped.push({ city, state });
          } else {
            result.skipped++; // Might be duplicate
          }
        } catch (error: any) {
          result.errors++;
          result.details.errors.push({ city, error: error.message });
        }
        
        processed++;
      }

      if (onProgress) {
        onProgress(processed, total);
      }

      if (i + batchSize < mappableCities.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to import mapped cities: ${error.message}`);
  }
};

/**
 * Get count of cities available for import
 */
export const getIndianCitiesCount = async (): Promise<number> => {
  try {
    const extracted = await import('./indian-cities-extracted.json');
    return extracted.total || 0;
  } catch {
    return 0;
  }
};

/**
 * Get preview of cities with their state mappings
 */
export const getCitiesPreview = async (limit: number = 50): Promise<Array<{ city: string; state: string | null }>> => {
  try {
    const extracted = await import('./indian-cities-extracted.json');
    const cities: string[] = extracted.cities.slice(0, limit) || [];
    
    return cities.map(city => {
      const match = matchCityToState(city);
      return {
        city,
        state: match?.state || null
      };
    });
  } catch {
    return [];
  }
};
