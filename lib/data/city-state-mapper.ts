// City to State mapping utility
// This helps map cities to their respective Indian states

import { stateCities } from './india-states';

export interface CityStateMapping {
  city: string;
  state: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Match a city name to its state based on existing state-city mappings
 */
export const matchCityToState = (cityName: string): CityStateMapping | null => {
  const normalizedCity = cityName.toLowerCase().trim();
  
  // Exact match (high confidence)
  for (const [state, cities] of Object.entries(stateCities)) {
    const exactMatch = cities.find(c => c.toLowerCase() === normalizedCity);
    if (exactMatch) {
      return {
        city: cityName,
        state: state,
        confidence: 'high'
      };
    }
  }
  
  // Partial match (medium confidence) - city name contains or is contained
  for (const [state, cities] of Object.entries(stateCities)) {
    const partialMatch = cities.find(c => {
      const normalizedExisting = c.toLowerCase();
      return normalizedExisting.includes(normalizedCity) || 
             normalizedCity.includes(normalizedExisting);
    });
    if (partialMatch) {
      return {
        city: cityName,
        state: state,
        confidence: 'medium'
      };
    }
  }
  
  return null;
};

/**
 * Match multiple cities to states
 */
export const matchCitiesToStates = (
  cities: string[]
): { mapped: CityStateMapping[]; unmapped: string[] } => {
  const mapped: CityStateMapping[] = [];
  const unmapped: string[] = [];
  
  for (const city of cities) {
    const match = matchCityToState(city);
    if (match) {
      mapped.push(match);
    } else {
      unmapped.push(city);
    }
  }
  
  return { mapped, unmapped };
};

/**
 * Get all cities that can be matched to a specific state
 */
export const getCitiesForState = (state: string): string[] => {
  return stateCities[state] || [];
};

/**
 * Get statistics about city-state mappings
 */
export const getMappingStats = (cities: string[]) => {
  const { mapped, unmapped } = matchCitiesToStates(cities);
  const byState: Record<string, number> = {};
  const byConfidence = { high: 0, medium: 0, low: 0 };
  
  mapped.forEach(m => {
    byState[m.state] = (byState[m.state] || 0) + 1;
    byConfidence[m.confidence]++;
  });
  
  return {
    total: cities.length,
    mapped: mapped.length,
    unmapped: unmapped.length,
    byState,
    byConfidence
  };
};
