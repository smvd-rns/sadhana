import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCityInput, sanitizeInput } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { state, cityName } = body;

    // Validate inputs
    const validation = validateCityInput(state, cityName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Sanitize inputs
    state = sanitizeInput(state);
    cityName = sanitizeInput(cityName);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    // Decide which key to use
    const shouldUseServiceKey = !!serviceRoleKey;

    // Create a custom fetch function that includes the headers
    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const fetchHeaders = new Headers(init?.headers);

      if (shouldUseServiceKey) {
        // With service key, we don't need the user's token for RLS bypass
        fetchHeaders.set('apikey', serviceRoleKey!);
        fetchHeaders.set('Authorization', `Bearer ${serviceRoleKey}`);
      } else {
        // Standard flow
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
      });
    };

    // Create Supabase client
    const keyToUse = shouldUseServiceKey ? serviceRoleKey! : supabaseAnonKey;

    const authenticatedClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    const trimmedState = state.trim();
    const trimmedCityName = cityName.trim();

    // Check if city already exists
    const { data: existing, error: checkError } = await authenticatedClient
      .from('cities')
      .select('id')
      .eq('state', trimmedState)
      .eq('name', trimmedCityName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.message?.includes('does not exist') || checkError.code === '42P01') {
        throw new Error('Cities table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (checkError.code === '42501' || checkError.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY in .env.local.');
      }
      throw new Error(checkError.message || 'Failed to check if city exists');
    }

    if (existing) {
      return NextResponse.json({ success: true });
    }

    // Insert new city
    const { error } = await authenticatedClient
      .from('cities')
      .insert({
        name: trimmedCityName,
        state: trimmedState,
      });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation (duplicate), return success
        return NextResponse.json({ success: true });
      }

      console.error('Supabase insert error:', error);

      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new Error('Cities table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY in .env.local.');
      }

      throw new Error(error.message || `Failed to insert city: ${error.code || 'Unknown error'}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding city to Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to add city';
    const errorString = error.message?.toLowerCase() || '';
    let status = 500;

    if (errorString.includes('permission denied') || errorString.includes('row-level security')) {
      status = 403;
      errorMessage = 'Permission denied. Unable to add city. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local for registration support.';
    } else if (errorString.includes('not initialized')) {
      status = 500;
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status });
  }
}
