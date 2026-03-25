const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log('Profiles data:', data, 'Error:', error);

    const { data: q1, error: e1 } = await supabase.from('users').select('*').limit(1);
    console.log('Users data:', q1, 'Error:', e1);
}

async function testRelations() {
    // Check if order_items has a relation to orders
    const { data, error } = await supabase.from('order_items').select('*').limit(1);
    console.log('order_items row:', data, 'Error:', error);

    // Check alertas_inventario
    const { data: a, error: ea } = await supabase.from('alertas_inventario').select('*').limit(1);
    console.log('alertas_inventario row:', a, 'Error:', ea);

    // Check payments
    const { data: p, error: ep } = await supabase.from('payments').select('*').limit(1);
    console.log('payments row:', p, 'Error:', ep);
}

testProfiles().then(testRelations);
