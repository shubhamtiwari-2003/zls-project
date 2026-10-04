-- Order fulfillment: admin moves paid orders through shipping steps.
--
--   orders.fulfillment_status:
--     unfulfilled → printing → out_for_shipping → in_transit
--                 → out_for_delivery → delivered
--   orders.courier / tracking_number / tracking_url: shipment details
--   order_status_events: history of every change (shown as a timeline).
--     source = 'admin' today; a courier webhook (e.g. Delhivery) can add
--     events with source = 'courier' later.

-- 1. Columns ----------------------------------------------------------------

alter table public.orders
  add column if not exists fulfillment_status text not null default 'unfulfilled',
  add column if not exists courier text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text;

alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders
  add constraint orders_fulfillment_status_check check (
    fulfillment_status in (
      'unfulfilled', 'printing', 'out_for_shipping', 'in_transit', 'out_for_delivery', 'delivered'
    )
  );

create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status, placed_at desc);

-- 2. Status history ---------------------------------------------------------

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  source text not null default 'admin' check (source in ('admin', 'courier', 'system')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_id_idx
  on public.order_status_events (order_id, created_at);

alter table public.order_status_events enable row level security;

drop policy if exists "Read own order events" on public.order_status_events;
create policy "Read own order events"
  on public.order_status_events for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_events.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- Written only by update_order_fulfillment() (or a future courier webhook).
revoke insert, update, delete on public.order_status_events from anon, authenticated;

-- 3. Admins can read shipping addresses (to pack and ship) -----------------

drop policy if exists "Admins read addresses" on public.addresses;
create policy "Admins read addresses"
  on public.addresses for select
  to authenticated
  using (public.is_admin());

-- 4. update_order_fulfillment(): the only way to change shipping status ----

create or replace function public.update_order_fulfillment(
  p_order_id uuid,
  p_status text,
  p_note text default null,
  p_courier text default null,
  p_tracking_number text default null,
  p_tracking_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_status not in (
    'unfulfilled', 'printing', 'out_for_shipping', 'in_transit', 'out_for_delivery', 'delivered'
  ) then
    raise exception 'Invalid status: %', p_status;
  end if;

  select * into v_order from orders where id = p_order_id for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'canceled' then
    raise exception 'This order was canceled';
  end if;

  if v_order.payment_status <> 'paid' then
    raise exception 'Only paid orders can be fulfilled';
  end if;

  update orders set
    fulfillment_status = p_status,
    courier         = coalesce(nullif(trim(p_courier), ''), courier),
    tracking_number = coalesce(nullif(trim(p_tracking_number), ''), tracking_number),
    tracking_url    = coalesce(nullif(trim(p_tracking_url), ''), tracking_url),
    fulfilled_at    = case when p_status = 'delivered' then coalesce(fulfilled_at, now()) else null end
  where id = p_order_id;

  -- History: every status change, or a note on the same status.
  if p_status is distinct from v_order.fulfillment_status or v_note is not null then
    insert into order_status_events (order_id, status, note, source, created_by)
    values (p_order_id, p_status, v_note, 'admin', auth.uid());
  end if;
end;
$$;

revoke execute on function public.update_order_fulfillment(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.update_order_fulfillment(uuid, text, text, text, text, text) to authenticated;
