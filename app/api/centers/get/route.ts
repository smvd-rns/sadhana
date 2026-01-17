import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Define types locally since we're bypassing the helper
interface CenterData {
  id: string;
  name: string;
  state: string;
  city: string;
  address?: string;
  contact?: string;
}

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || undefined;
    const city = searchParams.get('city') || undefined;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const shouldUseServiceKey = !!serviceRoleKey;

    // Custom fetch
    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const fetchHeaders = new Headers(init?.headers);

      if (shouldUseServiceKey) {
        fetchHeaders.set('apikey', serviceRoleKey!);
        fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
      } else {
        const authHeader = request.headers.get('authorization');
        const accessToken = authHeader?.replace('Bearer ', '');
        if (accessToken) {
          fetchHeaders.set('Authorization', `Bearer ${accessToken}`);
        }
        fetchHeaders.set('apikey', supabaseAnonKey);
      }

      fetchHeaders.set('Content-Type', 'application/json');

      return fetch(input, {
        ...init,
        headers: fetchHeaders,
        cache: 'no-store',
      });
    };

    const keyToUse = shouldUseServiceKey ? serviceRoleKey! : supabaseAnonKey;

    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    let query = supabase
      .from('centers')
      .select('*')
      .order('name');

    if (state) {
      query = query.eq('state', state);
    }

    if (city) {
      query = query.eq('city', city);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check Supabase RLS or configure SUPABASE_SERVICE_ROLE_KEY.');
      }
      throw new Error(error.message);
    }

    const centers = data || [];

    // Convert to the old format for backward compatibility
    const centersData: { [state: string]: { [city: string]: any[] } } = {};
    centers.forEach((center: CenterData) => {
      if (!centersData[center.state]) {
        centersData[center.state] = {};
      }
      if (!centersData[center.state][center.city]) {
        centersData[center.state][center.city] = [];
      }
      centersData[center.state][center.city].push(center);
    });

    return NextResponse.json(centersData);
  } catch (error: any) {
    console.error('Error getting centers from Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to get centers';
    let status = 500;

    if (error.message?.includes('relation "centers" does not exist')) {
      errorMessage = 'Centers table does not exist. Please run the Supabase schema SQL file first.';
    } else if (error.message?.includes('not initialized')) {
      errorMessage = 'Supabase is not initialized. Please check your environment variables.';
    } else if (error.message?.includes('Permission denied')) {
      status = 403;
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
