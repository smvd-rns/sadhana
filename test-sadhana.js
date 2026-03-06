const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testHistory() {
    console.log("Testing Sadhana History API directly via DB call (mirroring what API does)");

    const url = process.env.NEXT_PUBLIC_SADHANA_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SADHANA_DB_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const client = createClient(url, key);

    // Let's get any recent sadhana report to find a valid user_id
    const { data: anyReport, error: err1 } = await client
        .from('sadhana_reports')
        .select('*')
        .order('date', { ascending: false })
        .limit(1);

    if (!anyReport || anyReport.length === 0) {
        console.log("No sadhana reports in DB!");
        return;
    }

    const targetUserId = anyReport[0].user_id;
    const targetDate = anyReport[0].date;

    console.log(`Found a report for user ${targetUserId} on ${targetDate}`);

    // Now querying exact range
    const { data, error } = await client
        .from('sadhana_reports')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', '2026-01-01')
        .lte('date', '2026-12-31')
        .order('date', { ascending: false });

    if (error) {
        console.error("Error querying range:", error);
    } else {
        console.log(`Query returned ${data.length} reports for use_id = ${targetUserId}`);
    }

    // Also query without eq('user_id')
    const { data: bulkData } = await client
        .from('sadhana_reports')
        .select('*')
        .in('user_id', [targetUserId])
        .gte('date', '2026-01-01')
        .lte('date', '2026-12-31')
        .order('date', { ascending: false });

    console.log(`Bulk in query returned ${bulkData.length} reports`);
}

testHistory();
