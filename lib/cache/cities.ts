import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Fetches and groups cities from Supabase with caching.
 * Revalidate this cache using revalidateTag('cities')
 */
export const getCachedCities = unstable_cache(
  async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not set');
    }

    const keyToUse = serviceRoleKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, keyToUse);

    const { data, error } = await supabase
      .from('cities')
      .select('name, state')
      .order('state')
      .order('name');

    if (error) throw error;

    const citiesData: { [state: string]: string[] } = {};

    if (data) {
      data.forEach((city: any) => {
        if (!citiesData[city.state]) {
          citiesData[city.state] = [];
        }
        if (!citiesData[city.state].includes(city.name)) {
          citiesData[city.state].push(city.name);
        }
      });
    }

    return citiesData;
  },
  ['cities-list'],
  {
    revalidate: 3600,
    tags: ['cities']
  }
);
