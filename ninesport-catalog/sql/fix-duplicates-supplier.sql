-- ============================================================
-- 1) Columnas proveedor (si faltan)
-- ============================================================
alter table public.products add column if not exists supplier text default '';
alter table public.products add column if not exists supplier_code text default '';

-- ============================================================
-- 2) Marcar todos como Proveedor A (ajustá si hace falta)
-- ============================================================
update public.products
set supplier = 'A'
where coalesce(trim(supplier), '') = '';

-- ============================================================
-- 3) Activar todos para que se vean en la tienda
-- ============================================================
update public.products set active = true;

-- ============================================================
-- 4) Borrar DUPLICADOS reales (mismo path de imagen)
--    Se queda el de menor id; borra el resto.
-- ============================================================
delete from public.products p
using public.products p2
where p.id > p2.id
  and coalesce(p.images::text, '') = coalesce(p2.images::text, '')
  and coalesce(p.images::text, '') <> '[]'
  and coalesce(p.images::text, '') <> '';

-- Si no tienen imagen y se duplicaron por nombre:
delete from public.products p
using public.products p2
where p.id > p2.id
  and p.name = p2.name
  and p.category = p2.category
  and coalesce(p.images::text, '[]') = '[]';
