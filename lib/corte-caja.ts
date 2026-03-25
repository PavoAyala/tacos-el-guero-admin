import { supabase } from './supabase';

export interface TotalesPorMetodo {
    efectivo: number;
    tarjeta: number;
    otro: number;
    total: number;
}

export interface CorteCaja {
    id: string;
    fecha: string;
    efectivo_sistema: number;
    tarjeta_sistema: number;
    otro_sistema: number;
    total_sistema: number;
    efectivo_contado: number;
    diferencia: number;
    notas: string | null;
    created_at: string;
}

export interface NuevoCorte {
    fecha: string;
    efectivo_sistema: number;
    tarjeta_sistema: number;
    otro_sistema: number;
    total_sistema: number;
    efectivo_contado: number;
    notas?: string;
}

/**
 * Calcula totales del día agrupados por método de pago
 * usando la tabla `payments` de Supabase.
 */
// Todos los pagos del día cuentan como venta (pending = en proceso, completed = confirmado)
const STATUS_COMPLETADOS = ['completed', 'pending'];

export async function calcularTotalesDelDia(fecha: string): Promise<TotalesPorMetodo> {
    // La fecha viene como YYYY-MM-DD (local)
    // Usamos strings de fecha LOCAL directamente para no desplazar el día al convertir a UTC.
    // Esto funciona correctamente con columnas timestamp WITH time zone (después del fix SQL)
    // y también con timestamp WITHOUT time zone (antes del fix).
    const inicio = `${fecha}T00:00:00`;
    const fin   = `${fecha}T23:59:59.999`;

    const { data, error } = await supabase
        .from('payments')
        .select('payment_method, amount, status')
        .in('status', STATUS_COMPLETADOS)
        .gte('created_at', inicio)
        .lte('created_at', fin);

    if (error) throw error;

    const totales: TotalesPorMetodo = {
        efectivo: 0,
        tarjeta: 0,
        otro: 0,
        total: 0,
    };

    (data ?? []).forEach((p) => {
        const monto = Number(p.amount) || 0;
        const metodo = (p.payment_method as string)?.toLowerCase() ?? '';

        if (metodo === 'efectivo' || metodo === 'cash') {
            totales.efectivo += monto;
        } else if (
            metodo === 'tarjeta' ||
            metodo === 'card' ||
            metodo === 'credito' ||
            metodo === 'debito'
        ) {
            totales.tarjeta += monto;
        } else {
            totales.otro += monto;
        }

        totales.total += monto;
    });

    return totales;
}

/**
 * Guarda un corte de caja en Supabase.
 */
export async function guardarCorte(datos: NuevoCorte): Promise<CorteCaja> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('cortes_caja')
        .insert({
            ...datos,
            created_by: user?.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data as CorteCaja;
}

/**
 * Obtiene el historial de cortes más recientes.
 */
export async function obtenerHistorialCortes(limit = 30): Promise<CorteCaja[]> {
    const { data, error } = await supabase
        .from('cortes_caja')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data ?? []) as CorteCaja[];
}
