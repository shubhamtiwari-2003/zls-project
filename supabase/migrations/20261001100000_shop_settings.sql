-- Store rules editable from the admin panel (Settings tab).
--
-- One row only. Anyone can read it (the storefront shows shipping rules);
-- only admins can change it. The checkout server reads it on every quote
-- and order, so these values decide what customers are actually charged.

create table if not exists public.shop_settings (
  id boolean primary key default true check (id),

  -- Whole rupees.
  free_shipping_threshold integer not null default 999 check (free_shipping_threshold between 0 and 1000000),
  shipping_fee integer not null default 99 check (shipping_fee between 0 and 10000),

  max_qty_per_item integer not null default 10 check (max_qty_per_item between 1 and 50),
  -- "Only N left" at or below this.
  low_stock_threshold integer not null default 5 check (low_stock_threshold between 0 and 1000),

  -- Unpaid orders hold stock this long; the Razorpay window closes earlier.
  order_reservation_minutes integer not null default 30 check (order_reservation_minutes between 10 and 240),
  payment_window_minutes integer not null default 15 check (payment_window_minutes between 5 and 120),
  constraint shop_settings_payment_window_check
    check (payment_window_minutes <= order_reservation_minutes - 5),

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.shop_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.touch_shop_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists shop_settings_touch on public.shop_settings;
create trigger shop_settings_touch
  before update on public.shop_settings
  for each row execute function public.touch_shop_settings();

alter table public.shop_settings enable row level security;

drop policy if exists "Anyone reads shop settings" on public.shop_settings;
create policy "Anyone reads shop settings"
  on public.shop_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins update shop settings" on public.shop_settings;
create policy "Admins update shop settings"
  on public.shop_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The single row is created above; nobody adds or removes rows.
revoke insert, delete on public.shop_settings from anon, authenticated;

-- Carts may now hold up to the highest allowed per-item limit.
alter table public.cart_items drop constraint if exists cart_items_quantity_check;
alter table public.cart_items
  add constraint cart_items_quantity_check check (quantity between 1 and 50);
