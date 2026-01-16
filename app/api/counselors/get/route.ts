import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const ashram = searchParams.get('ashram') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase is not initialized. Please check your environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let query = supabase
      .from('counselors')
      .select('id, name, mobile, email, city, ashram')
      .order('name', { ascending: true });

    // If ashram filter provided, filter by ashram
    if (ashram.trim()) {
      query = query.eq('ashram', ashram.trim());
    }

    // If search term provided, filter by name or city
    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching counselors:', error);
      throw new Error(error.message || 'Failed to fetch counselors');
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in counselors GET route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch counselors' },
      { status: 500 }
    );
  }
}
