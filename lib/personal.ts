import { supabase } from './supabase';

export interface Profile {
    id: string;
    email?: string;
    display_name: string | null;
    avatar_url: string | null;
    role: 'admin' | 'staff' | 'manager' | null;
    created_at: string;
}

/**
 * Obtiene la lista de todo el personal (perfiles).
 */
export async function obtenerPersonal(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name', { ascending: true });

    if (error) {
        console.error('Error al obtener personal:', error);
        // Si la tabla profiles no existe o falla, intentamos con 'users' como fallback
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .order('display_name', { ascending: true });

        if (userError) throw userError;
        return (userData ?? []) as Profile[];
    }

    return (data ?? []) as Profile[];
}
