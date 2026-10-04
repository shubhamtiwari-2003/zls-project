-- Inventory: one stock row per product, enforced at checkout, deducted on payment.
--
--   * Every new product gets an inventory row with stock 1 (trigger).
--   * products.inventory_policy:
--       'deny'     → can't buy more than stock_available
--       'continue' → can always buy; stock is still counted down
--   * Stock is checked when the order is created (order_items trigger) and
--     deducted when the payment is confirmed (mark_order_paid).
--   * stock_available can go negative only if a 'continue' product oversells
--     or two customers pay for the last unit at the same moment — the admin
--     Inventory tab shows that as "Oversold".

-- 1. One row per product; delete inventory with the product ---------------

create unique index if not exists inventory_product_id_key
  on public.inventory (product_id);

do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.inventory'::regclass
      and contype = 'f'
      and confrelid = 'public.products'::regclass
  loop
    execute format('alter table public.inventory drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.inventory
  add constraint inventory_product_id_fkey
  foreign key (product_id) references public.products (id) on delete cascade;

-- Existing products start with 1 so they stay sellable; set real counts
-- in the admin Inventory tab.
insert into public.inventory (product_id, stock_available)
select p.id, 1
from public.products p
where not exists (select 1 from public.inventory i where i.product_id = p.id);

alter table public.inventory alter column product_id set not null;

-- 2. New products get stock 1 ----------------------------------------------

create or replace function public.create_inventory_for_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into inventory (product_id, stock_available)
  values (new.id, 1)
  on conflict (product_id) do nothing;
  return new;
end;
$$;

drop trigger if exists products_create_inventory on public.products;
create trigger products_create_inventory
  after insert on public.products
  for each row execute function public.create_inventory_for_product();

-- 3. RLS: anyone can read stock, only admins can change it -----------------

alter table public.inventory enable row level security;

drop policy if exists "Anyone reads inventory" on public.inventory;
create policy "Anyone reads inventory"
  on public.inventory for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins update inventory" on public.inventory;
create policy "Admins update inventory"
  on public.inventory for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Rows are created by the trigger and removed with the product.
revoke insert, delete on public.inventory from anon, authenticated;
revoke update on public.inventory from anon;

-- 4. Block orders that exceed stock ('deny' products) -----------------------

create or replace function public.check_stock_for_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
  v_policy text;
begin
  select i.stock_available, p.inventory_policy
  into v_stock, v_policy
  from products p
  left join inventory i on i.product_id = p.id
  where p.id = new.product_id;

  if coalesce(v_policy, 'deny') = 'deny' and coalesce(v_stock, 0) < new.quantity then
    raise exception 'Insufficient stock for %', coalesce(new.product_name, new.product_id::text);
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_check_stock on public.order_items;
create trigger order_items_check_stock
  before insert on public.order_items
  for each row execute function public.check_stock_for_order_item();

-- 5. Mark paid + deduct stock in one transaction ---------------------------

create or replace function public.mark_order_paid(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  -- Row lock: browser verify and webhook can arrive together.
  select * into v_order
  from orders
  where razorpay_order_id = p_razorpay_order_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_order.payment_status = 'paid' then
    return 'already_paid';
  end if;

  if p_amount_paise is not null and p_amount_paise <> v_order.total_amount * 100 then
    return 'amount_mismatch';
  end if;

  update orders
  set payment_status = 'paid',
      status = 'confirmed',
      razorpay_payment_id = p_razorpay_payment_id,
      paid_at = now()
  where id = v_order.id;

  update inventory i
  set stock_available = i.stock_available - oi.quantity,
      updated_at = now()
  from (
    select product_id, sum(quantity)::int as quantity
    from order_items
    where order_id = v_order.id
    group by product_id
  ) oi
  where i.product_id = oi.product_id;

  return 'paid';
end;
$$;

revoke execute on function public.mark_order_paid(text, text, bigint) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text, bigint) to service_role;
