-- Cart sync for signed-in users (guest carts stay in the browser).
--
--   * One row per (user, product); the browser upserts/deletes its own rows.
--   * unit_price is set from products.price by a trigger — never trusted
--     from the browser (checkout re-prices everything anyway).
--   * When an order is paid, its products are removed from the user's cart,
--     even if the customer's browser was closed.

-- 1. Shape ------------------------------------------------------------------

create unique index if not exists cart_items_user_product_key
  on public.cart_items (user_id, product_id);

alter table public.cart_items
  drop constraint if exists cart_items_quantity_check;
alter table public.cart_items
  add constraint cart_items_quantity_check check (quantity between 1 and 10);

-- Deleting a product removes it from carts (otherwise the delete would fail).
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.cart_items'::regclass
      and contype = 'f'
      and confrelid = 'public.products'::regclass
  loop
    execute format('alter table public.cart_items drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.cart_items
  add constraint cart_items_product_id_fkey
  foreign key (product_id) references public.products (id) on delete cascade;

-- 2. Price comes from the products table -------------------------------------

create or replace function public.set_cart_item_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select price into new.unit_price from products where id = new.product_id;

  if new.unit_price is null then
    raise exception 'Product not found';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cart_items_set_price on public.cart_items;
create trigger cart_items_set_price
  before insert or update on public.cart_items
  for each row execute function public.set_cart_item_price();

-- 3. RLS: users manage only their own cart -----------------------------------

alter table public.cart_items enable row level security;

drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart"
  on public.cart_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.cart_items from anon;

-- 4. Remove purchased items from the cart when an order is paid --------------

create or replace function public.clear_cart_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    delete from cart_items c
    using order_items oi
    where oi.order_id = new.id
      and c.user_id = new.user_id
      and c.product_id = oi.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_clear_cart_after_payment on public.orders;
create trigger orders_clear_cart_after_payment
  after update of payment_status on public.orders
  for each row execute function public.clear_cart_after_payment();



-- side cart is allowing me to add more stock even more than available stock