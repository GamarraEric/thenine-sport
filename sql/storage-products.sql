-- ============================================================
-- Storage: bucket de fotos de productos
-- Correr en SQL Editor de Supabase (después del setup-completo)
-- ============================================================

-- Crear bucket público para imágenes de productos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 4194304;

-- Lectura pública (el catálogo muestra las fotos)
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'products');

-- Solo el dueño sube / actualiza / borra
drop policy if exists "Owner upload product images" on storage.objects;
create policy "Owner upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'products'
    and auth.jwt() ->> 'email' = 'theninesport9@gmail.com'
  );

drop policy if exists "Owner update product images" on storage.objects;
create policy "Owner update product images"
  on storage.objects for update
  using (
    bucket_id = 'products'
    and auth.jwt() ->> 'email' = 'theninesport9@gmail.com'
  );

drop policy if exists "Owner delete product images" on storage.objects;
create policy "Owner delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'products'
    and auth.jwt() ->> 'email' = 'theninesport9@gmail.com'
  );
