-- ============================================================
-- FIX: RLS policy de payments corregida
-- PROBLEMA: has_role() estaba dentro del EXISTS → requería
--           una orden coincidente incluso para admins/dueños,
--           bloqueando pagos con order_id NULL o sin orden.
-- ============================================================

-- PASO 1: Verificar qué valores de status existen en payments
-- Ejecuta esto primero para saber el valor exacto a filtrar:
-- SELECT DISTINCT status, COUNT(*) FROM payments GROUP BY status;

-- PASO 2: Corregir la policy RLS de payments
drop policy if exists "payments_select_owner_or_staff" on public.payments;

create policy "payments_select_owner_or_staff"
on public.payments
for select
to public
using (
  -- Los roles con acceso total ven TODOS los pagos directamente
  has_role(array['admin', 'dueño', 'cajero'])
  or
  -- El dueño del pedido asociado ve su pago
  exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

-- PASO 3: Verificar que la columna created_at sea timezone-aware
-- Si devuelve 'timestamp without time zone', ejecuta el ALTER de abajo:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'payments' AND column_name = 'created_at';

-- PASO 4 (IMPORTANTE): Migrar created_at a timestamp WITH time zone
-- para que los rangos de fecha funcionen correctamente.
-- ADVERTENCIA: Esto asume que los timestamps existentes están en UTC.
-- Si el servidor de Supabase está en UTC (lo cual es lo más común), es seguro.
ALTER TABLE public.payments
  ALTER COLUMN created_at TYPE timestamp with time zone
  USING created_at AT TIME ZONE 'UTC';

-- PASO 5: Verificación final
-- SELECT
--   date_trunc('day', created_at AT TIME ZONE 'America/Mexico_City') AS dia_local,
--   payment_method,
--   SUM(amount) AS total
-- FROM payments
-- WHERE status IN ('completed', 'paid', 'done', 'success')  -- ajusta según tus valores
-- GROUP BY 1, 2
-- ORDER BY 1 DESC;
