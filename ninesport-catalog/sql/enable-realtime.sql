-- Activar tiempo real en products y orders (correr una vez en SQL Editor)
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.orders;
