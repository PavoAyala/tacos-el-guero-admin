-- Corrige la policy SELECT de payments para que el rol `dueño`
-- tambien pueda ver los pagos asociados a pedidos.
-- Ejecuta este archivo en el SQL Editor de Supabase.

drop policy if exists "payments_select_owner_or_staff" on public.payments;

create policy "payments_select_owner_or_staff"
on public.payments
for select
to public
using (
  exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and (
        o.user_id = auth.uid()
        or has_role(array['admin', 'dueño', 'cajero'])
      )
  )
);
