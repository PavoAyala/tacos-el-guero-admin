import { supabase } from './supabase';

export interface Profile {
    id: string;
    email?: string;
    name: string | null;
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
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener personal:', error);
        // Si la tabla profiles no existe o falla, intentamos con 'users' como fallback
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (userError) throw userError;
        return (userData ?? []) as Profile[];
    }

    return (data ?? []) as Profile[];
}
