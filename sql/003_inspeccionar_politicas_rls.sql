-- Inspecciona todas las politicas RLS expuestas en el esquema public.
-- Ejecuta este archivo en el SQL Editor de Supabase.

-- 1. Ver todas las politicas de todas las tablas en public
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 2. Ver solo las politicas de la tabla profiles
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

-- 3. Ver si RLS esta habilitado y/o forzado por tabla
select
  n.nspname as schemaname,
  c.relname as tablename,
  c.relrowsecurity as rls_habilitado,
  c.relforcerowsecurity as rls_forzado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 4. Ver funciones que suelen usarse dentro de policies
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_auth_role')
order by p.proname;
