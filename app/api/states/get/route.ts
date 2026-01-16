import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Use service role key to ensure we can read all data (public read is usually fine too, but this is safer for registration flow)
        const keyToUse = serviceRoleKey || supabaseAnonKey;

        if (!supabaseUrl || !keyToUse) {
            return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, keyToUse);

        // Get distinct states
        // Note: Supabase/PostgREST doesn't support 'distinct' directly on a column easily in one go with select without RPC, 
        // but we can try .select('state').
        // A better way for large datasets is RPC, but for ~1-2k rows, fetching all states and creating a Set is fine, 
        // OR determining unique states. 
        // Actually, .select('state', { count: 'exact', head: false }) isn't distinct.
        // The clean way is to creating an RPC function `get_states`, but I can't run SQL easily.
        // Fallback: Fetch all cities (id, state) and unique them server-side. It's not optimal but works for <10k rows.

        const { data, error } = await supabase
            .from('cities')
            .select('state')
            .order('state');

        if (error) {
            throw error;
        }

        if (!data) {
            return NextResponse.json([]);
        }

        // Extract unique states
        const states = Array.from(new Set(data.map(item => item.state))).sort();

        return NextResponse.json(states);

    } catch (error: any) {
        console.error('Error fetching states:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
