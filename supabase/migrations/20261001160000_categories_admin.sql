-- Categories managed from Admin → Categories.
--
--   sort_order        position in the header menu and the homepage carousel
--   badge_mode        homepage card badge:
--                       auto  "New Launch" when a product was added in the
--                             last 30 days
--                       new   always "New Launch"
--                       none  never
--   image_public_id   Cloudinary id of image_url (for cleanup)
--
-- Access is rebuilt from scratch, because the table was first set up in the
-- Supabase dashboard and its old policies aren't in these migrations:
--   * everyone reads active categories
--   * admins read and change everything

alter table public.categories
  add column if not exists sort_order integer not null default 0,
  add column if not exists badge_mode text not null default 'auto',
  add column if not exists image_public_id text;

alter table public.categories drop constraint if exists categories_badge_mode_check;
alter table public.categories
  add constraint categories_badge_mode_check check (badge_mode in ('auto', 'new', 'none'));

-- Start the order alphabetically (as the site showed them until now).
update public.categories c
set sort_order = ordered.position
from (select id, row_number() over (order by name) - 1 as position from public.categories) ordered
where c.id = ordered.id and c.sort_order = 0;

create index if not exists categories_sort_idx on public.categories (sort_order, name);

-- Replace whatever policies the dashboard created.
do $$
declare
  policy record;
begin
  for policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'categories' loop
    execute format('drop policy %I on public.categories', policy.policyname);
  end loop;
end;
$$;

alter table public.categories enable row level security;

create policy "Anyone reads active categories"
  on public.categories for select
  to anon, authenticated
  using (is_active);

create policy "Admins manage categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
