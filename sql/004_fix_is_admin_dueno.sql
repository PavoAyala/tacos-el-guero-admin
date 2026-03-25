-- Corrige la funcion public.is_admin() para que tambien considere al rol `dueño`.
-- Ejecuta este archivo en el SQL Editor de Supabase.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'dueño')
  );
$function$;

-- Verificacion sugerida:
-- select auth.uid(), public.is_admin();
