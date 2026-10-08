-- Finance: payment details, invoices, sales report.
--
--   orders.payment_*        how the customer paid (from Razorpay) and the
--                           Razorpay fee/tax, for the Payments tab.
--   invoice_settings        one row: the invoice template (Admin → Invoices).
--   invoices                one per paid order, numbered per Indian financial
--                           year (April–March): PREFIX/2026-27/0001. `data` is a
--                           frozen copy of seller, buyer, items and totals as at
--                           issue time; the template's look (colour, logo,
--                           notes) is applied when the PDF is drawn.
--   issue_invoice()         numbers and issues an invoice (idempotent).
--   admin_sales_report()    figures for Admin → Sales.

-- =========================================================================
-- 1. Payment details on orders
-- =========================================================================

alter table public.orders
  add column if not exists payment_method text,          -- upi, card, netbanking, wallet, emi…
  add column if not exists payment_details jsonb,        -- { bank, wallet, vpa, card_network, card_last4 }
  add column if not exists payment_fee bigint,           -- Razorpay fee incl. tax, paise
  add column if not exists payment_tax bigint;           -- GST on that fee, paise

-- =========================================================================
-- 2. Invoice template (one row)
-- =========================================================================

create table if not exists public.invoice_settings (
  id boolean primary key default true check (id),

  -- Seller block (copied onto each invoice when it's issued).
  seller_name text not null default 'Z Factor Studio',
  seller_legal_name text not null default '',
  seller_address text not null default '',
  seller_email text not null default '',
  seller_phone text not null default '',
  -- Empty = not GST-registered: the title says "Invoice" and no GST is shown.
  gstin text not null default '' check (gstin = '' or gstin ~ '^[0-9A-Z]{15}$'),

  -- Numbering: PREFIX/2026-27/0001
  invoice_prefix text not null default 'ZFS' check (invoice_prefix ~ '^[A-Z0-9-]{1,10}$'),

  -- Look (applied when drawing, also to existing invoices).
  accent_color text not null default '#0440AF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  footer_note text not null default 'Thank you for shopping with us!',
  terms text not null default 'Personalised items are made to order and cannot be returned unless damaged or defective. See our Cancellation & Refund Policy for details.',
  signature_label text not null default 'Authorised signatory',
  show_sku boolean not null default true,
  show_customization boolean not null default true,

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,

  constraint invoice_settings_lengths check (
    length(seller_name) <= 100 and length(seller_legal_name) <= 100 and length(seller_address) <= 400
    and length(seller_email) <= 120 and length(seller_phone) <= 30 and length(footer_note) <= 300
    and length(terms) <= 1000 and length(signature_label) <= 60
    and (logo_url is null or length(logo_url) <= 500)
  )
);

insert into public.invoice_settings (id, seller_legal_name, seller_email)
values (true, 'Shubham Kumar Tiwari', 'connect@zfactorstudio.in')
on conflict (id) do nothing;

create or replace function public.touch_invoice_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.invoice_prefix := upper(new.invoice_prefix);
  new.gstin := upper(trim(new.gstin));
  return new;
end;
$$;

drop trigger if exists invoice_settings_touch on public.invoice_settings;
create trigger invoice_settings_touch
  before update on public.invoice_settings
  for each row execute function public.touch_invoice_settings();

alter table public.invoice_settings enable row level security;

drop policy if exists "Admins read invoice settings" on public.invoice_settings;
create policy "Admins read invoice settings"
  on public.invoice_settings for select to authenticated using (public.is_admin());

drop policy if exists "Admins update invoice settings" on public.invoice_settings;
create policy "Admins update invoice settings"
  on public.invoice_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke insert, delete on public.invoice_settings from anon, authenticated;
revoke all on public.invoice_settings from anon;

-- =========================================================================
-- 3. Invoices
-- =========================================================================

create table if not exists public.invoice_counters (
  financial_year text primary key,          -- '2026-27'
  last_number integer not null default 0
);

alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  invoice_number text not null unique,
  financial_year text not null,
  issued_at timestamptz not null default now(),
  total_amount bigint not null,
  -- Frozen at issue: { title, seller{}, buyer{}, order{}, items[], totals{}, payment{} }
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_issued_at_idx on public.invoices (issued_at desc);

alter table public.invoices enable row level security;

drop policy if exists "Users read own invoices" on public.invoices;
create policy "Users read own invoices"
  on public.invoices for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Issued only by issue_invoice(); never edited or deleted from the app.
revoke insert, update, delete on public.invoices from anon, authenticated;

-- Indian financial year of a moment: April–March, e.g. '2026-27'.
create or replace function public.financial_year_of(p_at timestamptz)
returns text
language sql
stable
as $$
  select case
    when extract(month from p_at at time zone 'Asia/Kolkata') >= 4
      then to_char(p_at at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
           to_char((p_at at time zone 'Asia/Kolkata') + interval '1 year', 'YY')
    else to_char((p_at at time zone 'Asia/Kolkata') - interval '1 year', 'YYYY') || '-' ||
         to_char(p_at at time zone 'Asia/Kolkata', 'YY')
  end;
$$;

-- Issues the invoice of a paid order (or returns the existing one).
create or replace function public.issue_invoice(p_order_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice invoices%rowtype;
  v_order orders%rowtype;
  v_settings invoice_settings%rowtype;
  v_fy text;
  v_next integer;
  v_number text;
  v_address addresses%rowtype;
  v_email text;
  v_items jsonb;
begin
  select * into v_invoice from invoices where order_id = p_order_id;
  if found then
    return v_invoice;
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.payment_status <> 'paid' then
    raise exception 'Only paid orders get an invoice';
  end if;

  select * into v_settings from invoice_settings where id;
  v_fy := financial_year_of(coalesce(v_order.paid_at, now()));

  -- Next number for the year, with the counter row locked (no gaps/duplicates).
  insert into invoice_counters (financial_year) values (v_fy) on conflict do nothing;
  update invoice_counters set last_number = last_number + 1
  where financial_year = v_fy
  returning last_number into v_next;

  v_number := coalesce(v_settings.invoice_prefix, 'INV') || '/' || v_fy || '/' || lpad(v_next::text, 4, '0');

  select * into v_address from addresses where id = coalesce(v_order.billing_address_id, v_order.shipping_address_id);
  select email into v_email from auth.users where id = v_order.user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name', oi.product_name,
           'variant', oi.variant_title,
           'sku', oi.sku,
           'quantity', oi.quantity,
           'unit_price', oi.unit_price,
           'total', oi.total_price,
           -- Text personalisation only (photos aren't printed on invoices).
           'customization', (
             select coalesce(jsonb_agg(jsonb_build_object('label', f->>'label', 'value', f->>'value')), '[]'::jsonb)
             from jsonb_array_elements(coalesce(oi.customization, '[]'::jsonb)) f
             where f->>'type' = 'text'
           )
         ) order by oi.id), '[]'::jsonb)
  into v_items
  from order_items oi
  where oi.order_id = v_order.id;

  insert into invoices (order_id, user_id, invoice_number, financial_year, total_amount, data)
  values (
    v_order.id,
    v_order.user_id,
    v_number,
    v_fy,
    v_order.total_amount,
    jsonb_build_object(
      'title', case when coalesce(v_settings.gstin, '') <> '' then 'Tax Invoice' else 'Invoice' end,
      'seller', jsonb_build_object(
        'name', v_settings.seller_name,
        'legal_name', v_settings.seller_legal_name,
        'address', v_settings.seller_address,
        'email', v_settings.seller_email,
        'phone', v_settings.seller_phone,
        'gstin', nullif(v_settings.gstin, '')
      ),
      'buyer', jsonb_build_object(
        'name', v_address.full_name,
        'phone', v_address.phone,
        'email', v_email,
        'line1', v_address.line1,
        'line2', v_address.line2,
        'city', v_address.city,
        'state', v_address.state,
        'postal_code', v_address.postal_code,
        'country', 'India'
      ),
      'order', jsonb_build_object(
        'number', v_order.order_number,
        'placed_at', v_order.placed_at,
        'paid_at', v_order.paid_at
      ),
      'items', v_items,
      'totals', jsonb_build_object(
        'subtotal', v_order.subtotal_amount,
        'discount', coalesce(v_order.discount_amount, 0),
        'coupon_code', v_order.coupon_code,
        'shipping', v_order.shipping_amount,
        'total', v_order.total_amount
      ),
      'payment', jsonb_build_object(
        'method', v_order.payment_method,
        'reference', v_order.razorpay_payment_id
      )
    )
  )
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke execute on function public.issue_invoice(uuid) from public, anon, authenticated;
grant execute on function public.issue_invoice(uuid) to service_role;

-- Issue automatically on payment. Never blocks the payment: on failure it
-- only warns, and Admin → Invoices → "Issue missing" catches it up.
create or replace function public.issue_invoice_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    begin
      perform public.issue_invoice(new.id);
    exception when others then
      raise warning 'Invoice not issued for order %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_issue_invoice on public.orders;
create trigger orders_issue_invoice
  after update of payment_status on public.orders
  for each row execute function public.issue_invoice_after_payment();

-- Admin: paid orders without an invoice (oldest payment first).
create or replace function public.issue_missing_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  for r in
    select o.id from orders o
    where o.payment_status = 'paid'
      and not exists (select 1 from invoices i where i.order_id = o.id)
    order by o.paid_at nulls first, o.placed_at
  loop
    perform public.issue_invoice(r.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.issue_missing_invoices() from public, anon;
grant execute on function public.issue_missing_invoices() to authenticated;

-- =========================================================================
-- 4. Sales report (Admin → Sales)
-- =========================================================================
--
-- Paid orders with paid_at in [p_from, p_to). Days are IST calendar days.

create or replace function public.admin_sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with paid as (
    select * from orders
    where payment_status = 'paid' and paid_at >= p_from and paid_at < p_to
  ),
  lines as (
    select oi.*, p.category_id
    from order_items oi
    join paid on paid.id = oi.order_id
    left join products p on p.id = oi.product_id
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total_amount), 0),
        'orders', count(*),
        'subtotal', coalesce(sum(subtotal_amount), 0),
        'discount', coalesce(sum(discount_amount), 0),
        'shipping', coalesce(sum(shipping_amount), 0),
        'fees', coalesce(sum(payment_fee), 0),
        'customers', count(distinct user_id),
        'coupon_orders', count(*) filter (where coupon_id is not null)
      ) from paid
    ),
    'items_sold', (select coalesce(sum(quantity), 0) from lines),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'revenue', revenue, 'orders', orders) order by day), '[]'::jsonb)
      from (
        select (paid_at at time zone 'Asia/Kolkata')::date as day,
               sum(total_amount) as revenue,
               count(*) as orders
        from paid
        group by 1
      ) d
    ),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb)
      from (
        select coalesce(product_name, 'Product') as name, sum(quantity) as quantity, sum(total_price) as revenue
        from lines
        group by coalesce(product_name, 'Product')
        order by sum(total_price) desc
        limit 5
      ) t
    ),
    'categories', (
      select coalesce(jsonb_agg(c order by c.revenue desc), '[]'::jsonb)
      from (
        select coalesce(cat.name, 'Uncategorised') as name, sum(l.total_price) as revenue, sum(l.quantity) as quantity
        from lines l
        left join categories cat on cat.id = l.category_id
        group by coalesce(cat.name, 'Uncategorised')
        order by sum(l.total_price) desc
        limit 6
      ) c
    ),
    'payment_methods', (
      select coalesce(jsonb_agg(m order by m.orders desc), '[]'::jsonb)
      from (
        select coalesce(payment_method, 'unknown') as method, count(*) as orders, sum(total_amount) as revenue
        from paid
        group by coalesce(payment_method, 'unknown')
      ) m
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_sales_report(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_sales_report(timestamptz, timestamptz) to authenticated;
