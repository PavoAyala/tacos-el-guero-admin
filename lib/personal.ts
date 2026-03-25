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
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener personal:', error);
        // Si la tabla profiles no existe o falla, intentamos con 'users' como fallback
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (userError) throw userError;
        
        return (userData ?? []).map((u: any) => ({
            ...u,
            display_name: u.display_name || u.name || null
        })) as Profile[];
    }

    return (data ?? []).map((p: any) => ({
        ...p,
        display_name: p.display_name || p.name || null
    })) as Profile[];
}
