const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function backfillSlugs() {
    console.log('--- STARTING BACKFILL ---');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase environment variables.');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch all membership IDs
    const { data: membershipData, error: fetchError } = await supabase
        .from('membership_ids')
        .select('user_id, membership_id');

    if (fetchError) {
        console.error('Error fetching membership IDs:', fetchError);
        return;
    }

    console.log(`Found ${membershipData.length} membership records. Synchronizing...`);

    let successCount = 0;
    for (const record of membershipData) {
        const { error: updateError } = await supabase
            .from('users')
            .update({ donation_slug: record.membership_id })
            .eq('id', record.user_id);
            
        if (updateError) {
            console.error(`Failed to update user ${record.user_id}:`, updateError.message);
        } else {
            successCount++;
        }
    }

    console.log(`--- BACKFILL COMPLETE ---`);
    console.log(`Successfully synchronized ${successCount} out of ${membershipData.length} records.`);
}

backfillSlugs();
