import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCenterInput, sanitizeInput } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { name, state, city, address, contact } = body;

    // Validate inputs
    const validation = validateCenterInput(name, state, city, address, contact);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Rate Limiting
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    // Create a temporary client to get the user ID from the token
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    let userId = null;

    if (accessToken) {
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      const { data: { user } } = await tempClient.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    const { checkRateLimit } = await import('@/lib/rate-limit');
    const rateLimit = await checkRateLimit(request, userId, {
      action: 'add_center',
      limit: 20, // Max 20 centers
      windowMs: 60 * 60 * 1000, // 1 hour window
      blockDurationMs: 6 * 60 * 60 * 1000 // 6 hours block
    });

    if (rateLimit.blocked) {
      return NextResponse.json({
        error: rateLimit.message,
        retryAfter: rateLimit.retryAfter
      }, { status: 429 });
    }

    // Sanitize inputs
    name = sanitizeInput(name);
    state = sanitizeInput(state);
    city = sanitizeInput(city);
    if (address) address = sanitizeInput(address);
    if (contact) contact = sanitizeInput(contact);



    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use Service Role Key if available (Restricted RLS), otherwise fallback to Anon Key (Public RLS)
    const keyToUse = serviceRoleKey || supabaseAnonKey;

    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const fetchHeaders = new Headers(init?.headers);

      if (serviceRoleKey) {
        fetchHeaders.set('apikey', serviceRoleKey);
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
      });
    };

    const authenticatedClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: customFetch,
      },
    });

    const trimmedName = name.trim();
    const trimmedState = state.trim();
    const trimmedCity = city.trim();

    // Check if center already exists
    const { data: existing, error: checkError } = await authenticatedClient
      .from('centers')
      .select('id')
      .eq('state', trimmedState)
      .eq('city', trimmedCity)
      .eq('name', trimmedName)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      if (checkError.code !== '42501' && !checkError.message?.includes('permission denied')) {
        console.warn('Error checking if center exists:', checkError);
      }
    }

    if (existing) {
      // Center already exists, return success
      return NextResponse.json({ success: true, id: existing.id });
    }

    // Insert new center
    const { data: insertedData, error } = await authenticatedClient
      .from('centers')
      .insert({
        name: trimmedName,
        state: trimmedState,
        city: trimmedCity,
        address: address?.trim() || null,
        contact: contact?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation (duplicate), return success
        // Try to get the existing center
        const { data: existingCenter } = await authenticatedClient
          .from('centers')
          .select('id')
          .eq('state', trimmedState)
          .eq('city', trimmedCity)
          .eq('name', trimmedName)
          .single();
        return NextResponse.json({ success: true, id: existingCenter?.id });
      }

      console.error('Supabase insert error:', error);

      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new Error('Centers table does not exist. Please run the Supabase schema SQL file (supabase-schema.sql) in your Supabase SQL Editor first.');
      }
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Please check your Supabase RLS policies or configure SUPABASE_SERVICE_ROLE_KEY.');
      }

      throw new Error(error.message || `Failed to insert center: ${error.code || 'Unknown error'}`);
    }

    return NextResponse.json({ success: true, id: insertedData?.id });
  } catch (error: any) {
    console.error('Error adding center to Supabase:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to add center';
    let status = 500;
    const errorString = error.message?.toLowerCase() || '';

    if (errorString.includes('permission denied') || errorString.includes('row-level security')) {
      status = 403;
      errorMessage = 'Permission denied. Unable to add center.';
    } else if (errorString.includes('not initialized')) {
      status = 500;
    } else if (errorString.includes('relation') && errorString.includes('does not exist')) {
      errorMessage = 'Centers table does not exist. Please run the Supabase schema SQL file.';
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status });
  }
}
