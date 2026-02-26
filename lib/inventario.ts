import { supabase } from './supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UnidadMedida = 'kg' | 'g' | 'lt' | 'ml' | 'pza' | 'bolsa' | 'caja' | 'rollo';

export const UNIDADES: { value: UnidadMedida; label: string }[] = [
    { value: 'kg', label: 'Kilogramos (kg)' },
    { value: 'g', label: 'Gramos (g)' },
    { value: 'lt', label: 'Litros (lt)' },
    { value: 'ml', label: 'Mililitros (ml)' },
    { value: 'pza', label: 'Piezas (pza)' },
    { value: 'bolsa', label: 'Bolsas' },
    { value: 'caja', label: 'Cajas' },
    { value: 'rollo', label: 'Rollos' },
];

export const CATEGORIAS = [
    'Carnes',
    'Verduras',
    'Quesos y Lácteos',
    'Tortillas y Pan',
    'Bebidas',
    'Salsas y Condimentos',
    'Aceites y Grasas',
    'Otros',
];

export interface Ingrediente {
    id: string;
    nombre: string;
    cantidad_actual: number;
    unidad: string;
    categoria: string;
    stock_minimo: number;
    notas: string | null;
    created_at: string;
    updated_at: string;
}

export interface NuevoIngrediente {
    nombre: string;
    cantidad_actual: number;
    unidad: string;
    categoria: string;
    stock_minimo: number;
    notas?: string;
}

export interface AlertaInventario {
    id: string;
    ingrediente_id: string;
    atendida: boolean;
    atendida_at: string | null;
    created_at: string;
    ingredientes?: Ingrediente;
}

// ─── Ingredientes ─────────────────────────────────────────────────────────────

/** Obtiene todos los ingredientes ordenados por categoría y nombre. */
export async function obtenerIngredientes(): Promise<Ingrediente[]> {
    const { data, error } = await supabase
        .from('ingredientes')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Ingrediente[];
}

/** Crea un nuevo ingrediente. Si su cantidad es ≤ mínimo, crea la alerta. */
export async function crearIngrediente(datos: NuevoIngrediente): Promise<Ingrediente> {
    const { data, error } = await supabase
        .from('ingredientes')
        .insert(datos)
        .select()
        .single();

    if (error) throw error;
    const ingrediente = data as Ingrediente;

    // Crear alerta si arranca con stock bajo
    if (ingrediente.cantidad_actual <= ingrediente.stock_minimo) {
        await _crearAlertaSiNoExiste(ingrediente.id);
    }

    return ingrediente;
}

/** Actualiza un ingrediente. Gestiona alertas automáticamente. */
export async function actualizarIngrediente(
    id: string,
    datos: Partial<NuevoIngrediente>
): Promise<Ingrediente> {
    const { data, error } = await supabase
        .from('ingredientes')
        .update({ ...datos, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    const ingrediente = data as Ingrediente;

    if (ingrediente.cantidad_actual <= ingrediente.stock_minimo) {
        // Si sigue bajo stock, asegurar que exista alerta activa
        await _crearAlertaSiNoExiste(ingrediente.id);
    } else {
        // Si ya tiene stock suficiente, marcar alerta existente como atendida
        await _resolverAlertas(ingrediente.id);
    }

    return ingrediente;
}

/** Elimina un ingrediente (las alertas se eliminan en cascada). */
export async function eliminarIngrediente(id: string): Promise<void> {
    const { error } = await supabase.from('ingredientes').delete().eq('id', id);
    if (error) throw error;
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

/** Obtiene alertas activas (no atendidas) con datos del ingrediente. */
export async function obtenerAlertasActivas(): Promise<AlertaInventario[]> {
    const { data, error } = await supabase
        .from('alertas_inventario')
        .select('*, ingredientes(*)')
        .eq('atendida', false)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as AlertaInventario[];
}

/** Marca una alerta como atendida. */
export async function marcarAlertaAtendida(alertaId: string): Promise<void> {
    const { error } = await supabase
        .from('alertas_inventario')
        .update({
            atendida: true,
            atendida_at: new Date().toISOString(),
        })
        .eq('id', alertaId);

    if (error) throw error;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Crea una alerta para el ingrediente si no existe una activa. */
async function _crearAlertaSiNoExiste(ingredienteId: string): Promise<void> {
    const { data: existente } = await supabase
        .from('alertas_inventario')
        .select('id')
        .eq('ingrediente_id', ingredienteId)
        .eq('atendida', false)
        .maybeSingle();

    if (!existente) {
        await supabase
            .from('alertas_inventario')
            .insert({ ingrediente_id: ingredienteId });
    }
}

/** Resuelve todas las alertas activas de un ingrediente. */
async function _resolverAlertas(ingredienteId: string): Promise<void> {
    await supabase
        .from('alertas_inventario')
        .update({ atendida: true, atendida_at: new Date().toISOString() })
        .eq('ingrediente_id', ingredienteId)
        .eq('atendida', false);
}
