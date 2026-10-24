-- Proveedor A + carpeta Drive F11 + quitar duplicados
alter table public.products add column if not exists supplier text default '';
alter table public.products add column if not exists supplier_code text default '';
alter table public.products add column if not exists drive_folder_url text default '';

update public.products
set
  supplier = coalesce(nullif(trim(supplier), ''), 'A'),
  drive_folder_url = coalesce(nullif(trim(drive_folder_url), ''), 'https://drive.google.com/drive/folders/1yHUmJq1d0rV7DdZ1OHO411C12ghh60p8'),
  active = true;

delete from public.products p
using public.products p2
where p.id > p2.id
  and p.images is not null and p2.images is not null
  and jsonb_array_length(p.images) > 0
  and jsonb_array_length(p2.images) > 0
  and p.images->>0 = p2.images->>0;

delete from public.products p
using public.products p2
where p.id > p2.id
  and p.name = p2.name
  and p.category = p2.category;
