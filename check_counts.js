const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qgkbymthbwxdatmrixnx.supabase.co';
const supabaseAnonKey = 'sb_publishable_sDEhiX1Xcb4nFj-WxYc8eg_il914_Pi';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error('Profiles error:', pError.message);
    else console.log('Profiles returned via API:', profiles?.length || 0);

    const { data: users, error: uError } = await supabase.from('users').select('*');
    if (uError) console.error('Users error:', uError.message);
    else console.log('Users returned via API:', users?.length || 0);
}

checkData();
