-- ============================================================
-- FIX: Policy UPDATE en orders (causa el 403 Forbidden)
--      + Trigger para marcar pagos como 'completed' al insertar
-- ============================================================

-- PASO 1: Crear policy UPDATE en orders para admin/dueño/cajero
drop policy if exists "orders_update_staff" on public.orders;

create policy "orders_update_staff"
on public.orders
for update
to public
using (
  has_role(array['admin', 'dueño', 'cajero'])
  or user_id = auth.uid()
)
with check (
  has_role(array['admin', 'dueño', 'cajero'])
  or user_id = auth.uid()
);

-- PASO 2: Crear trigger para que todos los payments insertados
--         queden como 'completed' automáticamente si no se especifica otro status.
--         Esto normaliza el flujo y evita que queden en 'pending'.
create or replace function public.fn_payment_default_completed()
returns trigger
language plpgsql
as $$
begin
  -- Si se inserta sin status o con null, lo marcamos completed
  if NEW.status is null or NEW.status = '' then
    NEW.status := 'completed';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_payment_default_completed on public.payments;

create trigger trg_payment_default_completed
before insert on public.payments
for each row
execute function public.fn_payment_default_completed();

-- PASO 3: Actualizar los payments 'pending' actuales a 'completed'
--         (son ventas reales que quedaron mal marcadas)
update public.payments
set status = 'completed'
where status = 'pending';

-- Verificación
select status, count(*) from payments group by status;
