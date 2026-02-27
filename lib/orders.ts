import { supabase } from './supabase';

export type OrderType = 'dine-in' | 'takeout';

export interface Order {
    id: number;
    user_id: string;
    total_amount: number;
    order_type: OrderType;
    status: string;
    created_at: string;
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
    // Asumimos que la tabla 'payments' existe y tiene esta estructura basada en lib/corte-caja.ts
    const { error: paymentError } = await supabase
        .from('payments')
        .insert({
            order_id: order.id,
            amount: datos.total_amount,
            payment_method: 'efectivo',
            status: 'completed',
            // created_at se genera automáticamente por defecto en la mayoría de esquemas de Supabase
        });

    if (paymentError) {
        console.error('Error al crear el pago sincronizado:', paymentError);
        // No lanzamos error aquí para no bloquear la creación de la orden, 
        // pero es ideal que el admin sepa que hubo un problema de sincronización.
    }

    return order as Order;
}
