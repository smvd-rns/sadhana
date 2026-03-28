require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SADHANA_DB_URL;
const supabaseKey = process.env.SADHANA_DB_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials for Sadhana DB");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('donations').insert([{
    donor_name: 'Test',
    donor_email: 'test@example.com',
    donor_mobile: '1234567890',
    donor_address: 'Address',
    donor_pan: 'PAN',
    amount: 10,
    payment_status: 'pending',
    payment_method: 'Easebuzz',
    txnid: 'test_123',
    tag_user_id: '123e4567-e89b-12d3-a456-426614174000',
    center: 'Center',
    temple: 'Temple',
    ashram: 'Ashram',
    metadata: { env: "test" }
  }]);

  if (error) {
    console.error("DB Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success:", data);
  }
}

check();
