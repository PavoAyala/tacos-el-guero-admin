create extension if not exists pgcrypto;

create table if not exists public.fiscal_config (
    id uuid primary key default gen_random_uuid(),
    regimen_fiscal text not null,
    tasa_iva numeric(6,4) not null default 0.1600 check (tasa_iva >= 0 and tasa_iva <= 1),
    porcentaje_isr numeric(6,4) not null default 0.3000 check (porcentaje_isr >= 0 and porcentaje_isr <= 1),
    rfc text null,
    razon_social text null,
    ventas_incluyen_iva boolean not null default true,
    productos_exentos_habilitados boolean not null default false,
    notas text null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.gastos (
    id uuid primary key default gen_random_uuid(),
    fecha date not null,
    concepto text not null,
    subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
    iva numeric(12,2) not null default 0 check (iva >= 0),
    total numeric(12,2) not null default 0 check (total >= 0),
    metodo_pago text not null check (
        metodo_pago in ('efectivo', 'tarjeta', 'transferencia', 'spei', 'otro')
    ),
    categoria text not null,
    deducible boolean not null default true,
    acreditable boolean not null default true,
    cfdi_folio text null,
    notas text null,
    created_by uuid null references auth.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint gastos_total_consistente check (round((subtotal + iva)::numeric, 2) = round(total::numeric, 2))
);

alter table public.orders
    add column if not exists tax_type text not null default 'gravado';

alter table public.orders
    drop constraint if exists orders_tax_type_check;

alter table public.orders
    add constraint orders_tax_type_check check (tax_type in ('gravado', 'exento'));

alter table public.products
    add column if not exists tax_type text not null default 'gravado';

alter table public.products
    drop constraint if exists products_tax_type_check;

alter table public.products
    add constraint products_tax_type_check check (tax_type in ('gravado', 'exento'));

create index if not exists idx_gastos_fecha on public.gastos(fecha);
create index if not exists idx_gastos_created_by on public.gastos(created_by);
create index if not exists idx_orders_created_at_status on public.orders(created_at, status);
create index if not exists idx_payments_created_at_status on public.payments(created_at, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists trg_fiscal_config_updated_at on public.fiscal_config;
create trigger trg_fiscal_config_updated_at
before update on public.fiscal_config
for each row
execute function public.set_updated_at();

drop trigger if exists trg_gastos_updated_at on public.gastos;
create trigger trg_gastos_updated_at
before update on public.gastos
for each row
execute function public.set_updated_at();
