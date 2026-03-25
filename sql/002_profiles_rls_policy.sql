-- Migración para permitir que administradores o gerentes vean a todo el personal
-- Resuelve el problema de que RLS oculta a los demás usuarios en public.profiles

-- 1. Crear una función "Security Definer" para obtener el rol del usuario conectado.
-- Al usar SECURITY DEFINER evitamos el error de recursión infinita de RLS que ocurriría
-- si consultáramos la misma tabla public.profiles dentro de su propia política.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Agregar la nueva política de SELECT
-- NOTA: Como en Supabase las políticas son aditivas (OR), esta política
-- convivirá con "profiles_select_own".
CREATE POLICY "profiles_select_all_for_admins" 
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'dueño')
);
