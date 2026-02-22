import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = 'https://qfrcoaatgubverfpgoaw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcmNvYWF0Z3VidmVyZnBnb2F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU4MjU3NCwiZXhwIjoyMDg3MTU4NTc0fQ.mVnzznGSYsZQi2BhZT60DYUGVSh8CSr056_kdZceVEI';

const activeSupabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await activeSupabase
        .from('sadhana_reports')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(10);

    console.log(data);
}

check();
