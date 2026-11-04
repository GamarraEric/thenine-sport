-- Stock: no permitir vender más de lo disponible al crear el pedido
-- Correr en SQL Editor de Supabase

create or replace function public.decrement_stock_on_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  pid bigint;
  qty int;
  av text;
  current_stock int;
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
    av := coalesce(item->>'availability', 'stock');

    -- Encargos (restock): no tocan stock_qty; tope razonable 3
    if av = 'restock' then
      if qty > 3 then
        raise exception 'Máximo 3 unidades por artículo en encargo';
      end if;
      continue;
    end if;

    if pid is not null and qty > 0 then
      select stock_qty into current_stock
      from public.products
      where id = pid and availability = 'stock'
      for update;

      if current_stock is null then
        -- Producto no es de stock local; no descontar
        continue;
      end if;

      if current_stock < qty then
        raise exception 'Stock insuficiente para el producto % (hay %, pediste %)', pid, current_stock, qty;
      end if;

      update public.products
      set stock_qty = stock_qty - qty
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
