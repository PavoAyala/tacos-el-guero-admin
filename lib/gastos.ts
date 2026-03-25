import { supabase } from './supabase';

export type MetodoPagoGasto =
    | 'efectivo'
    | 'tarjeta'
    | 'transferencia'
    | 'spei'
    | 'otro';

export interface Gasto {
    id: string;
    fecha: string;
    concepto: string;
    subtotal: number;
    iva: number;
    total: number;
    metodo_pago: MetodoPagoGasto;
    categoria: string;
    deducible: boolean;
    acreditable: boolean;
    cfdi_folio: string | null;
    notas: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface NuevoGasto {
    fecha: string;
    concepto: string;
    subtotal: number;
    iva: number;
    total: number;
    metodo_pago: MetodoPagoGasto;
    categoria: string;
    deducible: boolean;
    acreditable?: boolean;
    cfdi_folio?: string;
    notas?: string;
}

export interface PeriodoMensual {
    inicio: string;
    fin: string;
}

export function obtenerRangoMensual(periodo: string): PeriodoMensual {
    const match = /^(\d{4})-(\d{2})$/.exec(periodo);
    if (!match) {
        throw new Error('El periodo debe tener formato YYYY-MM.');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (monthIndex < 0 || monthIndex > 11) {
        throw new Error('El mes del periodo es invalido.');
    }

    const inicio = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const fin = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    return {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
    };
}

export function validarGasto(input: NuevoGasto): string[] {
    const errores: string[] = [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
        errores.push('La fecha debe tener formato YYYY-MM-DD.');
    }

    if (!input.concepto.trim()) {
        errores.push('El concepto del gasto es obligatorio.');
    }

    if (!input.categoria.trim()) {
        errores.push('La categoria del gasto es obligatoria.');
    }

    if (!Number.isFinite(input.subtotal) || input.subtotal < 0) {
        errores.push('El subtotal debe ser un numero mayor o igual a 0.');
    }

    if (!Number.isFinite(input.iva) || input.iva < 0) {
        errores.push('El IVA debe ser un numero mayor o igual a 0.');
    }

    if (!Number.isFinite(input.total) || input.total < 0) {
        errores.push('El total debe ser un numero mayor o igual a 0.');
    }

    const totalEsperado = redondearMoneda(input.subtotal + input.iva);
    const totalCapturado = redondearMoneda(input.total);

    if (Math.abs(totalEsperado - totalCapturado) > 0.01) {
        errores.push('El total debe coincidir con subtotal + IVA.');
    }

    return errores;
}

export async function crearGasto(input: NuevoGasto): Promise<Gasto> {
    const errores = validarGasto(input);
    if (errores.length > 0) {
        throw new Error(errores.join(' '));
    }

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('gastos')
        .insert({
            fecha: input.fecha,
            concepto: input.concepto.trim(),
            subtotal: input.subtotal,
            iva: input.iva,
            total: input.total,
            metodo_pago: input.metodo_pago,
            categoria: input.categoria.trim(),
            deducible: input.deducible,
            acreditable: input.acreditable ?? input.deducible,
            cfdi_folio: input.cfdi_folio?.trim() || null,
            notas: input.notas?.trim() || null,
            created_by: userData.user?.id ?? null,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data as Gasto;
}

export async function actualizarGasto(id: string, input: NuevoGasto): Promise<Gasto> {
    const errores = validarGasto(input);
    if (errores.length > 0) {
        throw new Error(errores.join(' '));
    }

    const { data, error } = await supabase
        .from('gastos')
        .update({
            fecha: input.fecha,
            concepto: input.concepto.trim(),
            subtotal: input.subtotal,
            iva: input.iva,
            total: input.total,
            metodo_pago: input.metodo_pago,
            categoria: input.categoria.trim(),
            deducible: input.deducible,
            acreditable: input.acreditable ?? input.deducible,
            cfdi_folio: input.cfdi_folio?.trim() || null,
            notas: input.notas?.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Gasto;
}

export async function eliminarGasto(id: string): Promise<void> {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) throw error;
}

export async function obtenerGastosDelMes(periodo: string): Promise<Gasto[]> {
    const { inicio, fin } = obtenerRangoMensual(periodo);

    const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .gte('fecha', inicio.slice(0, 10))
        .lte('fecha', fin.slice(0, 10))
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Gasto[];
}

function redondearMoneda(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}
