
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounselorsSchema() {
    const { data, error } = await supabase
        .from('counselors')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Counselor keys:', Object.keys(data[0] || {}));
    }
}

checkCounselorsSchema();
