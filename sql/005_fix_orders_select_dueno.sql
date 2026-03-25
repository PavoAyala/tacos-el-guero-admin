-- Corrige la policy SELECT de orders para que el rol `dueño`
-- tambien pueda ver todos los pedidos.
-- Ejecuta este archivo en el SQL Editor de Supabase.

drop policy if exists "orders_select_owner_or_staff" on public.orders;

create policy "orders_select_owner_or_staff"
on public.orders
for select
to public
using (
  (user_id = auth.uid())
  or has_role(array['admin', 'dueño', 'cocina', 'cajero'])
);
