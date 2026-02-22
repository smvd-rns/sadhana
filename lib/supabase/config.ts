import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | undefined;

// Initialize Supabase client (works on both client and server)
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: typeof window !== 'undefined', // Only persist sessions on client
        autoRefreshToken: typeof window !== 'undefined', // Only auto-refresh on client
      },
    });
  } catch (error) {
    console.error('Supabase initialization error:', error);
  }
} else {
  // Log warning on both client and server (for debugging)
  const hasUrl = !!supabaseUrl;
  const hasKey = !!supabaseAnonKey;

  if (typeof window === 'undefined') {
    // Server-side (API routes) - always log errors
    if (!hasUrl || !hasKey) {
      console.error('⚠️ Supabase environment variables not set on server!');
      console.error(`NEXT_PUBLIC_SUPABASE_URL: ${hasUrl ? '✓ Set' : '✗ Missing'}`);
      console.error(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasKey ? '✓ Set' : '✗ Missing'}`);
      console.error('Please create a .env.local file in the project root with:');
      console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
      console.error('You can find these values in your Supabase dashboard: Settings > API');
    }
  } else {
    // Client-side - only warn (don't spam console)
    if (!hasUrl || !hasKey) {
      console.warn('Supabase environment variables not set. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    }
  }
}

export { supabase };
export default supabase;
