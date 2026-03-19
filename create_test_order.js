
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qgkbymthbwxdatmrixnx.supabase.co';
const supabaseAnonKey = 'sb_publishable_sDEhiX1Xcb4nFj-WxYc8eg_il914_Pi';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestOrder() {
    console.log('--- Creating Test Order ---');

    // 1. Get a user
    const { data: userData } = await supabase.from('profiles').select('id').limit(1);
    const userId = userData && userData.length > 0 ? userData[0].id : '00000000-0000-0000-0000-000000000000';

    // 2. Get a product
    const { data: productData } = await supabase.from('products').select('*').limit(1);
    if (!productData || productData.length === 0) {
        console.error('No products found to create test order.');
        return;
    }
    const product = productData[0];

    // 3. Create Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            total_amount: product.price * 2,
            order_type: 'dine-in',
            status: 'pending'
        })
        .select()
        .single();

    if (orderError) {
        console.error('Error creating order:', orderError);
        return;
    }

    console.log(`Order created with ID: ${order.id}`);

    // 4. Create Order Items
    const { error: itemError } = await supabase
        .from('order_items')
        .insert({
            order_id: order.id,
            product_id: product.id,
            quantity: 2,
            unit_price: product.price,
            subtotal: product.price * 2
        });

    if (itemError) {
        console.error('Error creating order item:', itemError);
    } else {
        console.log('Test order and items created successfully.');
    }
}

createTestOrder();
