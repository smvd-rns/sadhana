import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define types locally since we're bypassing the helper
interface CitiesData {
  [state: string]: string[];
}

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not initialized. Please check your environment variables.');
  }

  // Get authorization header
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  // Decide which key to use
  const shouldUseServiceKey = !!serviceRoleKey;

  // Create a custom fetch function that includes the headers
  const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const fetchHeaders = new Headers(init?.headers);

    if (shouldUseServiceKey) {
      fetchHeaders.set('apikey', serviceRoleKey!);
      fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
    } else {
      if (accessToken) {
        fetchHeaders.set('Authorization', `Bearer ${accessToken}`);
      }
      fetchHeaders.set('apikey', supabaseAnonKey);
    }

    fetchHeaders.set('Content-Type', 'application/json');

    return fetch(input, {
      ...init,
      headers: fetchHeaders,
    });
  };

  // Create Supabase client
  const keyToUse = shouldUseServiceKey ? serviceRoleKey! : supabaseAnonKey;

  const client = createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: customFetch,
    },
  });

  return client;
}

export async function GET(request: Request) {
  try {
    // Create client (admin if available)
    const supabase = createAuthenticatedClient(request);

    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('state')
      .order('name');

    if (error) {
      // Check for RLS/Permissions error
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY in .env.local.');
      }
      throw new Error(error.message);
    }

    // Convert to CitiesData format (state -> cities array)
    const citiesData: CitiesData = {};

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

    return NextResponse.json(citiesData);
  } catch (error: any) {
    console.error('Error getting cities from Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to get cities';
    let status = 500;

    if (error.message?.includes('relation "cities" does not exist')) {
      errorMessage = 'Cities table does not exist. Please run the Supabase schema SQL file first.';
    } else if (error.message?.includes('not initialized')) {
      errorMessage = 'Supabase is not initialized. Please check your environment variables.';
    } else if (error.message?.includes('Permission denied')) {
      status = 403;
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
