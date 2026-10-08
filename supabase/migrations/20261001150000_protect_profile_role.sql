-- Security: customers must never be able to make themselves admins.
--
-- Customers update their own profile (name) straight from the browser
-- (ProfileForm). If profiles' update rights ever include the `role` column,
-- anyone could run
--     supabase.from("profiles").update({ role: "admin" }).eq("user_id", me)
-- in the browser console and get the whole admin panel.
--
-- This trigger blocks that whatever the table's policies and grants are:
-- `role` can only be set or changed by
--   * an existing admin,
--   * the server (service role key), or
--   * direct SQL (Supabase dashboard / SQL editor) and the sign-up trigger,
--     which run without a logged-in user.
-- New profiles created by customers themselves always get role 'user'.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Role of the API caller: 'anon', 'authenticated', 'service_role', or ''
  -- when the change doesn't come through the API.
  caller text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if caller in ('', 'service_role') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' and not public.is_admin() then
      raise exception 'Not allowed to set the profile role' using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Not allowed to change the profile role' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();
