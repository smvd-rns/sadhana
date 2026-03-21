const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkRpc() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Try to get function definition
    const { data, error } = await supabase.rpc('get_function_definition', { function_name: 'generate_membership_id' });
    
    if (error) {
        console.error('Error fetching function definition:', error);
        // If get_function_definition doesn't exist, we'll try a different approach or just test the function
        return;
    }
    
    console.log('Function Definition:', data);
}

checkRpc();
