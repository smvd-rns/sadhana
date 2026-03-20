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

/**
 * Singleton Admin Client for Sadhana DB
 */
let _sadhanaAdmin: SupabaseClient | null = null;

export function getSadhanaAdminClient(): SupabaseClient {
    if (_sadhanaAdmin) return _sadhanaAdmin;

    const url = process.env.NEXT_PUBLIC_SADHANA_DB_URL;
    const key = process.env.SADHANA_DB_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error('Sadhana DB Service Role credentials missing.');
    }

    _sadhanaAdmin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    return _sadhanaAdmin;
}

export { sadhanaDb };
export default sadhanaDb;
