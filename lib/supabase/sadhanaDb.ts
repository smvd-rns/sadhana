import { createClient, SupabaseClient } from '@supabase/supabase-js';

const sadhanaDbUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL || '';
const sadhanaDbAnonKey = process.env.NEXT_PUBLIC_SADHANA_DB_ANON_KEY || '';

let sadhanaDb: SupabaseClient | undefined;

// Initialize Supabase client for the secondary (Sadhana) database
if (sadhanaDbUrl && sadhanaDbAnonKey) {
    try {
        sadhanaDb = createClient(sadhanaDbUrl, sadhanaDbAnonKey, {
            auth: {
                persistSession: false, // Don't interfere with Auth sessions
                autoRefreshToken: false,
            },
        });
    } catch (error) {
        console.error('Sadhana DB initialization error:', error);
    }
} else {
    if (typeof window === 'undefined') {
        if (!sadhanaDbUrl || !sadhanaDbAnonKey) {
            console.warn('⚠️ Sadhana DB environment variables not set on server!');
        }
    } else {
        if (!sadhanaDbUrl || !sadhanaDbAnonKey) {
            console.warn('Sadhana DB environment variables not set.');
        }
    }
}

export { sadhanaDb };
export default sadhanaDb;
