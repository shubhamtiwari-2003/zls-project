-- Checkout: server-priced orders + Razorpay.
--
-- Orders are created ONLY by the server (service role) through create_order().
-- Clients can read their own orders but can never insert or change them, so
-- prices and totals cannot be tampered with from the browser.

-- 1. Columns needed for Razorpay and order history ------------------------

alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists orders_razorpay_order_id_key
  on public.orders (razorpay_order_id);

create unique index if not exists orders_order_number_key
  on public.orders (order_number);

create index if not exists orders_user_id_placed_at_idx
  on public.orders (user_id, placed_at desc);

-- Snapshot of the name at purchase time (products can be renamed later).
alter table public.order_items
  add column if not exists product_name text;

-- ISO 3166-1 alpha-2 country code ("IN"). Table is empty, so this is safe.
alter table public.addresses
  alter column country type char(2);

-- 2. Row Level Security ---------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses enable row level security;

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses"
  on public.addresses for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Orders are written only by the server. This overrides any policy.
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

-- 3. create_order(): address + order + items in one transaction -----------

create or replace function public.create_order(
  p_user_id uuid,
  p_address jsonb,
  p_items jsonb,
  p_subtotal bigint,
  p_shipping bigint,
  p_total bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_address_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_items_total bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order has no items';
  end if;

  -- Defence in depth: totals must add up.
  select coalesce(sum((x->>'total_price')::bigint), 0)
  into v_items_total
  from jsonb_array_elements(p_items) x;

  if v_items_total <> p_subtotal or p_subtotal + p_shipping <> p_total then
    raise exception 'Order totals do not add up';
  end if;

  insert into addresses (
    user_id, full_name, phone, line1, line2, city, state, postal_code, country
  )
  values (
    p_user_id,
    p_address->>'full_name',
    p_address->>'phone',
    p_address->>'line1',
    nullif(p_address->>'line2', ''),
    p_address->>'city',
    p_address->>'state',
    p_address->>'postal_code',
    'IN'
  )
  returning id into v_address_id;

  v_order_number :=
    'ZLS-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into orders (
    order_number, user_id, status, payment_status,
    subtotal_amount, shipping_amount, tax_amount, discount_amount, total_amount,
    shipping_address_id, billing_address_id, payment_gateway
  )
  values (
    v_order_number, p_user_id, 'pending', 'unpaid',
    p_subtotal, p_shipping, 0, 0, p_total,
    v_address_id, v_address_id, 'razorpay'
  )
  returning id into v_order_id;

  insert into order_items (
    order_id, product_id, product_name, sku, quantity, unit_price, total_price, tax
  )
  select
    v_order_id,
    (x->>'product_id')::uuid,
    x->>'product_name',
    x->>'sku',
    (x->>'quantity')::int,
    (x->>'unit_price')::bigint,
    (x->>'total_price')::bigint,
    0
  from jsonb_array_elements(p_items) x;

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
end;
$$;

-- Server only: never callable from the browser.
revoke execute on function public.create_order(uuid, jsonb, jsonb, bigint, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, jsonb, bigint, bigint, bigint)
  to service_role;
