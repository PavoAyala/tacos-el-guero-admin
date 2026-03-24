import { supabase } from './supabase';

export interface FiscalConfig {
    id: string;
    regimen_fiscal: string;
    tasa_iva: number;
    porcentaje_isr: number;
    rfc: string | null;
    razon_social: string | null;
    ventas_incluyen_iva: boolean;
    productos_exentos_habilitados: boolean;
    notas: string | null;
    created_at: string;
    updated_at: string;
}

export interface FiscalConfigInput {
    regimen_fiscal: string;
    tasa_iva: number;
    porcentaje_isr: number;
    rfc?: string;
    razon_social?: string;
    ventas_incluyen_iva?: boolean;
    productos_exentos_habilitados?: boolean;
    notas?: string;
}

export const DEFAULT_FISCAL_CONFIG: FiscalConfigInput = {
    regimen_fiscal: 'Persona Fisica con Actividad Empresarial',
    tasa_iva: 0.16,
    porcentaje_isr: 0.3,
    ventas_incluyen_iva: true,
    productos_exentos_habilitados: false,
    rfc: '',
    razon_social: '',
    notas: '',
};

export function validarFiscalConfig(config: FiscalConfigInput): string[] {
    const errores: string[] = [];

    if (!config.regimen_fiscal.trim()) {
        errores.push('El regimen fiscal es obligatorio.');
    }

    if (!Number.isFinite(config.tasa_iva) || config.tasa_iva < 0 || config.tasa_iva > 1) {
        errores.push('La tasa de IVA debe estar entre 0 y 1.');
    }

    if (
        !Number.isFinite(config.porcentaje_isr) ||
        config.porcentaje_isr < 0 ||
        config.porcentaje_isr > 1
    ) {
        errores.push('El porcentaje de ISR debe estar entre 0 y 1.');
    }

    return errores;
}

export async function obtenerFiscalConfig(): Promise<FiscalConfig | null> {
    const { data, error } = await supabase
        .from('fiscal_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return (data ?? null) as FiscalConfig | null;
}

export async function guardarFiscalConfig(input: FiscalConfigInput): Promise<FiscalConfig> {
    const errores = validarFiscalConfig(input);
    if (errores.length > 0) {
        throw new Error(errores.join(' '));
    }

    const { data: existente, error: consultaError } = await supabase
        .from('fiscal_config')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (consultaError) throw consultaError;

    const payload = {
        regimen_fiscal: input.regimen_fiscal.trim(),
        tasa_iva: input.tasa_iva,
        porcentaje_isr: input.porcentaje_isr,
        rfc: input.rfc?.trim() || null,
        razon_social: input.razon_social?.trim() || null,
        ventas_incluyen_iva: input.ventas_incluyen_iva ?? true,
        productos_exentos_habilitados: input.productos_exentos_habilitados ?? false,
        notas: input.notas?.trim() || null,
        updated_at: new Date().toISOString(),
    };

    const query = existente?.id
        ? supabase.from('fiscal_config').update(payload).eq('id', existente.id)
        : supabase.from('fiscal_config').insert(payload);

    const { data, error } = await query.select().single();

    if (error) throw error;
    return data as FiscalConfig;
}
