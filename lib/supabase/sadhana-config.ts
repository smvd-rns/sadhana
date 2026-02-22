import { createClient, SupabaseClient } from '@supabase/supabase-js';

const sadhanaSupabaseUrl = process.env.NEXT_PUBLIC_SADHANA_SUPABASE_URL || '';
const sadhanaSupabaseAnonKey = process.env.NEXT_PUBLIC_SADHANA_SUPABASE_ANON_KEY || '';
const sadhanaSupabaseServiceKey = process.env.SADHANA_SUPABASE_SERVICE_ROLE_KEY || '';

let sadhanaSupabase: SupabaseClient | undefined;

// Use service role key on server-side, anon key on client-side
const supabaseKey = (typeof window === 'undefined' && sadhanaSupabaseServiceKey)
    ? sadhanaSupabaseServiceKey
    : sadhanaSupabaseAnonKey;

if (sadhanaSupabaseUrl && supabaseKey) {
    try {
        sadhanaSupabase = createClient(sadhanaSupabaseUrl, supabaseKey, {
            auth: {
                persistSession: typeof window !== 'undefined',
                autoRefreshToken: typeof window !== 'undefined',
            },
        });
    } catch (error) {
        console.error('Sadhana Supabase initialization error:', error);
    }
} else {
    // Only log error on server to avoid exposing missing keys on client if not needed
    if (typeof window === 'undefined') {
        if (!sadhanaSupabaseUrl || !supabaseKey) {
            console.warn('⚠️ Secondary Database (Sadhana) environment variables not set!');
        }
    }
}

export { sadhanaSupabase };
export default sadhanaSupabase;
