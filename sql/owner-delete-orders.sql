-- Permitir al dueño eliminar pedidos de a uno
drop policy if exists "Owner can delete orders" on public.orders;
create policy "Owner can delete orders"
  on public.orders for delete
  using (auth.jwt() ->> 'email' = 'theninesport9@gmail.com');
