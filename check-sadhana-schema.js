import { getAdminSadhanaSupabase } from './lib/supabase/sadhana.js';

async function checkSchema() {
    const supabase = getAdminSadhanaSupabase();
    if (!supabase) {
        console.error('Failed to get Sadhana admin client');
        process.exit(1);
    }

    const { data, error } = await supabase
        .from('event_responses')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching event_responses:', error);
    } else {
        console.log('Columns in event_responses:', Object.keys(data[0] || {}));
    }
}

checkSchema();
