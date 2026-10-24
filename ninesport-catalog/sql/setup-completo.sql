-- ============================================================
-- THE NINE SPORT – Setup completo (correr en SQL Editor)
-- ============================================================

-- 1) Tabla de productos (stock)
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null default 'accesorios',
  price numeric not null default 0,
  badge text default '',
  images jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  description text default '',
  availability text not null default 'stock' check (availability in ('stock', 'restock')),
  stock_qty integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 2) Asegurar columnas en orders
alter table public.orders add column if not exists notas text;
-- estados posibles: nuevo | confirmado | preparado | entregado | cancelado
alter table public.orders drop constraint if exists orders_estado_check;
alter table public.orders add constraint orders_estado_check
  check (estado in ('nuevo', 'confirmado', 'preparado', 'entregado', 'cancelado'));

-- 3) RLS products
alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select
  using (active = true);

drop policy if exists "Owner can manage products" on public.products;
create policy "Owner can manage products"
  on public.products for all
  using (auth.jwt() ->> 'email' = 'theninesport9@gmail.com')
  with check (auth.jwt() ->> 'email' = 'theninesport9@gmail.com');

-- 4) Descontar stock al crear pedido
create or replace function public.decrement_stock_on_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  pid bigint;
  qty int;
begin
  for item in select * from jsonb_array_elements(new.items)
  loop
    pid := null;
    begin
      pid := (item->>'id')::bigint;
    exception when others then
      pid := null;
    end;
    qty := coalesce((item->>'cantidad')::int, 1);
    if pid is not null and qty > 0 then
      update public.products
      set stock_qty = greatest(0, stock_qty - qty)
      where id = pid and availability = 'stock';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_order_created_stock on public.orders;
create trigger on_order_created_stock
  after insert on public.orders
  for each row execute procedure public.decrement_stock_on_order();

-- 5) Políticas dueño (por si faltan)
drop policy if exists "Owner can view all orders" on public.orders;
create policy "Owner can view all orders"
  on public.orders for select
  using (auth.jwt() ->> 'email' = 'theninesport9@gmail.com');

drop policy if exists "Owner can update orders" on public.orders;
create policy "Owner can update orders"
  on public.orders for update
  using (auth.jwt() ->> 'email' = 'theninesport9@gmail.com');

drop policy if exists "Owner can view all profiles" on public.profiles;
create policy "Owner can view all profiles"
  on public.profiles for select
  using (auth.jwt() ->> 'email' = 'theninesport9@gmail.com');

-- 6) Seed productos demo (solo si la tabla está vacía)
insert into public.products (name, category, price, badge, images, sizes, description, availability, stock_qty)
select * from (values
(
  'Botines Nike Mercurial F11',
  'f11',
  48500,
  'Más Vendido',
  '["https://newsport.vtexassets.com/arquivos/ids/21198859-800-auto?v=639161765822770000&width=800&height=auto&aspect=true","https://newsport.vtexassets.com/arquivos/ids/21198860-800-auto?v=639161765825030000&width=800&height=auto&aspect=true"]'::jsonb,
  '[39,40,41,42,43,44]'::jsonb,
  'Diseñados para máxima velocidad y control en césped natural.',
  'stock',
  8
),
(
  'Botines Adidas Predator F5',
  'f5',
  46000,
  'Nuevo',
  '["https://redsport.vtexassets.com/arquivos/ids/1223740-800-800?v=639120347353500000&width=800&height=800&aspect=true"]'::jsonb,
  '[38,39,40,41,42]'::jsonb,
  'Excelente agarre en canchas sintéticas.',
  'stock',
  5
),
(
  'Zapatillas Futsal Profesional',
  'futsal',
  39000,
  'Oferta',
  '["https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcQ-wGlt-8iay5L4aS7WCbrkJ4ZlIBgY3oewKzeEkEji8DcsSa9bbxk4MqH4NoqcP9TpV2DQJtXXtBsqDvOLeI1XoFHFyJTuxnav6sCJVN2vg4J0xAUqy2RPIbk"]'::jsonb,
  '[39,40,41,42,43]'::jsonb,
  'Suela de goma antideslizante.',
  'stock',
  6
),
(
  'Medias Antideslizantes Precortadas',
  'accesorios',
  6500,
  'Popular',
  '["https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQFsnP-f8sSs0upBzbO4Pc0oodqznd9oVmhqB5ruvIQV9TNdIWy3IjHwOa-xlLok8BFQRbc-YgZ78cCdiQAA3GHsRA45l4Mmw"]'::jsonb,
  '["Único"]'::jsonb,
  'Grip de silicona interno y externo.',
  'stock',
  20
),
(
  'Canilleras Ultra Pro',
  'accesorios',
  8500,
  '',
  '["https://mediasbahia.com.ar/wp-content/uploads/2026/06/gemini_generated_image_nu3jm4nu3jm4nu3j-e6c6d7f2d3672c9d0517730736259796-1024-1024.webp"]'::jsonb,
  '["Chico","Mediano","Grande"]'::jsonb,
  'Protección de alto impacto.',
  'restock',
  0
),
(
  'Botinero adidas Tiro',
  'accesorios',
  22000,
  'Destacado',
  '["https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRH-f2dsu8SsU-iw24vJFJUAE6VThL8H4KOr7AwoYjPtWPLWFsjugZ1-N0FnrVZSqb1bYKIKXnQtGaTXMqPWsZHiKtKjAt3bta6zOCUYXBav-9ILi5NLGbwWsg"]'::jsonb,
  '["Único"]'::jsonb,
  'Compartimiento inferior para botines. Resistente al agua.',
  'restock',
  0
)
) as v(name, category, price, badge, images, sizes, description, availability, stock_qty)
where not exists (select 1 from public.products limit 1);
