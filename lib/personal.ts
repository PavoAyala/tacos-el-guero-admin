import { supabase } from './supabase';

export interface Profile {
    id: string;
    email?: string | null;
    display_name: string | null;
    avatar_url: string | null;
    role: 'cliente' | 'cocina' | 'cajero' | 'admin' | 'mesero' | 'dueño' | null;
    created_at: string;
}

/**
 * Obtiene la lista de todo el personal (perfiles).
 */
export async function obtenerPersonal(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, created_at');

    if (error) {
        console.error('Error al obtener personal de profiles:', error.message);
        throw error;
    }

    return (data ?? [])
        .map((p: any) => ({
            id: p.id,
            email: null,
            avatar_url: null,
            role: p.role ?? null,
            created_at: p.created_at,
            display_name: p.display_name ?? p.name ?? p.email ?? 'Sin nombre',
        }))
        .sort((a, b) => a.display_name!.localeCompare(b.display_name!, 'es', { sensitivity: 'base' }));
}

export async function obtenerConteoClientes(): Promise<number> {
    const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

    if (error) {
        console.error('Error al contar clientes desde profiles:', error.message);
        throw error;
    }

    return count ?? 0;
}
