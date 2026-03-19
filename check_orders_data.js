
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qgkbymthbwxdatmrixnx.supabase.co';
const supabaseAnonKey = 'sb_publishable_sDEhiX1Xcb4nFj-WxYc8eg_il914_Pi';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrders() {
    console.log('--- Checking Orders ---');
    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        console.log(`Found ${data.length} orders.`);
        data.forEach(o => {
            console.log(`ID: ${o.id}, Status: ${o.status}, Amount: ${o.total_amount}`);
        });
    }
    console.log('---');
}

checkOrders();
