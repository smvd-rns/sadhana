import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase admin client (service role).
 * Reused across all API route invocations in the same server process
 * to avoid creating a new connection + memory allocation per request.
 */
let _adminClient: SupabaseClient | null = null;

const cleanEnvVar = (val: string | undefined) => {
    if (!val) return undefined;
    return val.trim().replace(/^["']|["']$/g, '');
};

export function getAdminClient(): SupabaseClient {
    if (_adminClient) return _adminClient;

    const supabaseUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const serviceRoleKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    return _adminClient;
}

/**
 * Verify a Bearer token and return the authenticated user.
 * Returns null if the token is missing or invalid.
 */
export async function getAuthUserFromRequest(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);

    if (error || !user) return null;
    return user;
}
