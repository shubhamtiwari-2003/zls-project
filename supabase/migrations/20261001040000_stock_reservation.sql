-- Stock reservation: hold stock while a customer is paying.
--
--   inventory.stock_available  = units on hand (edited by the admin)
--   inventory.stock_reserved   = units held by unpaid checkouts
--   sellable                   = stock_available - stock_reserved
--
-- Lifecycle of an order's stock:
--   order created   → reserve      (blocked if not enough sellable stock)
--   payment success → deduct       (on hand -= qty, reserved -= qty)
--   abandoned       → release      (customer closed the payment window)
--   expired         → release      (unpaid after 30 minutes)
--   paid after it was released (late UPI etc.) → deduct directly; can show
--   as "Oversold" in the admin Inventory tab if stock ran out meanwhile.

-- 1. Columns ---------------------------------------------------------------

alter table public.inventory
  add column if not exists stock_reserved integer not null default 0;

alter table public.inventory
  drop constraint if exists inventory_stock_reserved_check;
alter table public.inventory
  add constraint inventory_stock_reserved_check check (stock_reserved >= 0);

-- Whether this order currently holds a stock reservation.
alter table public.orders
  add column if not exists stock_reserved boolean not null default false;

create index if not exists orders_pending_placed_at_idx
  on public.orders (placed_at)
  where status = 'pending' and payment_status = 'unpaid';

-- 2. Reserve when order items are created (replaces the stock check) --------

drop trigger if exists order_items_check_stock on public.order_items;
drop function if exists public.check_stock_for_order_item();

create or replace function public.reserve_stock_for_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy text;
  v_updated integer;
begin
  select inventory_policy into v_policy from products where id = new.product_id;

  if coalesce(v_policy, 'deny') = 'deny' then
    -- Row lock + condition: two checkouts can't both take the last unit.
    update inventory
    set stock_reserved = stock_reserved + new.quantity,
        updated_at = now()
    where product_id = new.product_id
      and stock_available - stock_reserved >= new.quantity;

    get diagnostics v_updated = row_count;

    if v_updated = 0 then
      raise exception 'Insufficient stock for %', coalesce(new.product_name, new.product_id::text);
    end if;
  else
    -- 'continue': never blocks, but still tracked.
    update inventory
    set stock_reserved = stock_reserved + new.quantity,
        updated_at = now()
    where product_id = new.product_id;
  end if;

  update orders set stock_reserved = true where id = new.order_id;

  return new;
end;
$$;

drop trigger if exists order_items_reserve_stock on public.order_items;
create trigger order_items_reserve_stock
  before insert on public.order_items
  for each row execute function public.reserve_stock_for_order_item();

-- 3. Release / cancel / expire ---------------------------------------------

create or replace function public.release_order_stock(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update inventory i
  set stock_reserved = greatest(i.stock_reserved - oi.quantity, 0),
      updated_at = now()
  from (
    select product_id, sum(quantity)::int as quantity
    from order_items
    where order_id = p_order_id
    group by product_id
  ) oi
  where i.product_id = oi.product_id;

  update orders set stock_reserved = false where id = p_order_id;
end;
$$;

-- Cancels an unpaid pending order and releases its stock.
-- p_user_id: when given, the order must belong to that user.
create or replace function public.cancel_order(p_order_id uuid, p_user_id uuid default null)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reserved boolean;
begin
  update orders
  set status = 'canceled',
      canceled_at = now()
  where id = p_order_id
    and status = 'pending'
    and payment_status = 'unpaid'
    and (p_user_id is null or user_id = p_user_id)
  returning stock_reserved into v_reserved;

  if not found then
    return false;
  end if;

  if v_reserved then
    perform public.release_order_stock(p_order_id);
  end if;

  return true;
end;
$$;

-- Cancels unpaid orders older than p_minutes. Returns how many.
create or replace function public.expire_stale_orders(p_minutes integer default 30)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id from orders
    where status = 'pending'
      and payment_status = 'unpaid'
      and placed_at < now() - make_interval(mins => p_minutes)
    for update skip locked
  loop
    if public.cancel_order(r.id, null) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- 4. Mark paid: turn the reservation into a deduction ----------------------

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
  -- Row lock: browser verify, webhook and expiry can race.
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

  update inventory i
  set stock_available = i.stock_available - oi.quantity,
      stock_reserved = case
        when v_order.stock_reserved then greatest(i.stock_reserved - oi.quantity, 0)
        else i.stock_reserved
      end,
      updated_at = now()
  from (
    select product_id, sum(quantity)::int as quantity
    from order_items
    where order_id = v_order.id
    group by product_id
  ) oi
  where i.product_id = oi.product_id;

  -- A late payment on an expired order still counts: un-cancel it.
  update orders
  set payment_status = 'paid',
      status = 'confirmed',
      stock_reserved = false,
      canceled_at = null,
      razorpay_payment_id = p_razorpay_payment_id,
      paid_at = now()
  where id = v_order.id;

  return 'paid';
end;
$$;

-- 5. Server only -------------------------------------------------------------

revoke execute on function public.release_order_stock(uuid) from public, anon, authenticated;
revoke execute on function public.cancel_order(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.expire_stale_orders(integer) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(text, text, bigint) from public, anon, authenticated;

grant execute on function public.release_order_stock(uuid) to service_role;
grant execute on function public.cancel_order(uuid, uuid) to service_role;
grant execute on function public.expire_stale_orders(integer) to service_role;
grant execute on function public.mark_order_paid(text, text, bigint) to service_role;
