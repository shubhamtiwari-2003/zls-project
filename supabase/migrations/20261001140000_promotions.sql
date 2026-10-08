-- Promotions: campaigns for events (Diwali, New Year, Black Friday…) and
-- what each one shows on the site.
--
--   promo_campaigns   one per event: name, start/end, on/off, priority
--   promotions        what the campaign shows, by placement:
--                       hero_banner       homepage carousel slide (image)
--                       announcement_bar  message in the bar above the header
--                       popup             one-time popup for visitors
--                       product_notice    note on product pages (all, some
--                                         categories, or some products)
--
-- Customers can read only what is live: the item and its campaign are on,
-- and now() is inside the campaign's dates. So scheduling needs no cron —
-- a campaign appears at starts_at and disappears at ends_at by itself.
-- Admins read and write everything.

create table if not exists public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  -- When campaigns overlap, the higher priority goes first (banners,
  -- messages) or wins (popup).
  priority integer not null default 0 check (priority between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promo_campaigns_dates_check check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promo_campaigns (id) on delete cascade,
  placement text not null check (placement in ('hero_banner', 'announcement_bar', 'popup', 'product_notice')),
  is_active boolean not null default true,
  sort_order integer not null default 0,

  -- Text. Which fields are used depends on the placement (see the admin form).
  tag text check (tag is null or length(tag) <= 40),
  title text check (title is null or length(title) <= 120),
  body text check (body is null or length(body) <= 400),
  cta_label text check (cta_label is null or length(cta_label) <= 30),
  -- A path on this site (/products/...) or a full https:// link.
  link_url text check (link_url is null or (length(link_url) <= 500 and (link_url ~ '^/' or link_url ~ '^https://'))),

  -- Images (Cloudinary). The mobile image is optional.
  image_url text,
  image_public_id text,
  mobile_image_url text,
  mobile_image_public_id text,

  -- Colour preset for bars, notices and popups (see src/lib/promotions.ts).
  tone text not null default 'brand' check (tone in ('brand', 'dark', 'festive', 'sale', 'green')),

  -- Product notices only: where they show.
  target text not null default 'all' check (target in ('all', 'categories', 'products')),
  category_ids uuid[] not null default '{}',
  product_ids uuid[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promotions_banner_image check (placement <> 'hero_banner' or image_url is not null),
  constraint promotions_needs_title check (placement = 'hero_banner' or length(trim(coalesce(title, ''))) > 0),
  constraint promotions_cta_needs_link check (cta_label is null or link_url is not null)
);

create index if not exists promotions_campaign_idx on public.promotions (campaign_id, placement, sort_order);

-- updated_at
create or replace function public.touch_promotion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists promo_campaigns_touch on public.promo_campaigns;
create trigger promo_campaigns_touch
  before update on public.promo_campaigns
  for each row execute function public.touch_promotion();

drop trigger if exists promotions_touch on public.promotions;
create trigger promotions_touch
  before update on public.promotions
  for each row execute function public.touch_promotion();

-- RLS
alter table public.promo_campaigns enable row level security;
alter table public.promotions enable row level security;

drop policy if exists "Anyone reads live campaigns" on public.promo_campaigns;
create policy "Anyone reads live campaigns"
  on public.promo_campaigns for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "Admins manage campaigns" on public.promo_campaigns;
create policy "Admins manage campaigns"
  on public.promo_campaigns for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The campaign lookup runs under the reader's RLS, so for customers it only
-- finds live campaigns.
drop policy if exists "Anyone reads live promotions" on public.promotions;
create policy "Anyone reads live promotions"
  on public.promotions for select
  to anon, authenticated
  using (
    is_active
    and exists (select 1 from public.promo_campaigns c where c.id = campaign_id)
  );

drop policy if exists "Admins manage promotions" on public.promotions;
create policy "Admins manage promotions"
  on public.promotions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.promo_campaigns, public.promotions to anon, authenticated;
grant insert, update, delete on public.promo_campaigns, public.promotions to authenticated;
