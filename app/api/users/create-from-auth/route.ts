import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized');
    }

    // Get the authenticated user from the session
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingUser) {
      // User already exists
      return NextResponse.json({ success: true, message: 'User already exists', id: existingUser.id });
    }

    // Create user record - use service role key if available to bypass RLS
    const clientToUse = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      : supabase;

    const { data: insertedUser, error: insertError } = await clientToUse
      .from('users')
      .insert({
        id: user.id,
        email: user.email?.toLowerCase() || '',
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: [1], // Default role: student (role 1)
        state: null,
        city: null,
        center: null,
        counselor: null,
        hierarchy: {}, // Keep for backward compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating user record:', insertError);

      // If it's a duplicate error, user was created between check and insert
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'User already exists' });
      }

      return NextResponse.json({
        error: insertError.message || 'Failed to create user record',
        details: process.env.NODE_ENV === 'development' ? insertError : undefined
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      id: insertedUser?.id
    });
  } catch (error: any) {
    console.error('Error in create-from-auth:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
