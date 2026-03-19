import { supabase } from './supabase';

export type OrderType = 'dine-in' | 'takeout';

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products?: {
        name: string;
    };
}

export interface Order {
    id: number;
    user_id: string;
    total_amount: number;
    order_type: 'dine-in' | 'takeout';
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    order_items?: OrderItem[];
}

export interface NewOrder {
    total_amount: number;
    order_type: OrderType;
}

/**
 * Crea una orden manual y su respectivo pago en efectivo.
 * Esto asegura que la venta se refleje en el corte de caja.
 */
export async function crearOrderManual(datos: NewOrder): Promise<Order> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('No se encontró un usuario autenticado');

    // 1. Crear la orden
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            total_amount: datos.total_amount,
            order_type: datos.order_type,
            status: 'completed'
        })
        .select()
        .single();

    if (orderError) throw orderError;

    // 2. Crear el pago asociado (para que aparezca en el corte de caja)
    const { error: paymentError } = await supabase
        .from('payments')
        .insert({
            order_id: order.id,
            amount: datos.total_amount,
            payment_method: 'efectivo',
            status: 'completed',
        });

    if (paymentError) {
        console.error('Error al crear el pago sincronizado:', paymentError);
        // Opcional: Podrías alertar al usuario, pero como es manual se asume completado
    }

    return order as Order;
}

/**
 * Obtiene los pedidos pendientes (status = 'pending').
 */
export async function obtenerPedidosPendientes(): Promise<any[]> {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                id,
                quantity,
                unit_price,
                subtotal,
                products (
                    name
                )
            )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as any[];
}

/**
 * Marca un pedido como completado.
 */
export async function completarPedido(id: number): Promise<void> {
    const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', id);

    if (error) throw error;
}
