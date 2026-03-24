import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Fetches and groups centers from Supabase with caching.
 * Revalidate this cache using revalidateTag('centers')
 */
export const getCachedCenters = unstable_cache(
  async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not set');
    }

    const keyToUse = serviceRoleKey || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, keyToUse);

    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .order('name');

    if (error) throw error;

    const centers = data || [];
    const centersData: { [state: string]: { [city: string]: any[] } } = {};

    centers.forEach((center: any) => {
      if (!centersData[center.state]) {
        centersData[center.state] = {};
      }
      if (!centersData[center.state][center.city]) {
        centersData[center.state][center.city] = [];
      }
      centersData[center.state][center.city].push(center);
    });

    return centersData;
  },
  ['centers-list'],
  {
    revalidate: 3600, // Fallback 1 hour
    tags: ['centers']
  }
);
