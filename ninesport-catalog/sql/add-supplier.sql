-- Proveedor y código (para el panel del dueño)
alter table public.products add column if not exists supplier text default '';
alter table public.products add column if not exists supplier_code text default '';

-- Marcar los actuales como Proveedor A (ajustá si hace falta)
update public.products
set supplier = 'A'
where coalesce(supplier, '') = '';
