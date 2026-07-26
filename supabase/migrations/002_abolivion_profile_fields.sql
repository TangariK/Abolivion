-- 002: username, role, e-mail opcional, newsletter, tag de nome
-- Safe on shared project: only touches abolivion_* objects.

alter table public.abolivion_profiles
  add column if not exists username text,
  add column if not exists role text not null default 'player',
  add column if not exists has_real_email boolean not null default false,
  add column if not exists accept_newsletter boolean not null default false,
  add column if not exists show_name_tag boolean not null default false;

alter table public.abolivion_profiles
  drop constraint if exists abolivion_profiles_role_check;
alter table public.abolivion_profiles
  add constraint abolivion_profiles_role_check check (role in ('player', 'admin'));

create unique index if not exists abolivion_profiles_username_key
  on public.abolivion_profiles (lower(username))
  where username is not null;

-- Role must never be settable by the client (enforced in 004 via trigger).
-- Keep table-level grants so PostgREST upsert + updated_at trigger work.
grant select, insert, update, delete on public.abolivion_profiles to authenticated;

-- Signup trigger now records username / email flags from auth metadata
create or replace function public.abolivion_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abolivion_profiles (
    id, display_name, username, has_real_email, accept_newsletter
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'username', ''),
    coalesce((new.raw_user_meta_data->>'has_real_email')::boolean, false),
    coalesce((new.raw_user_meta_data->>'accept_newsletter')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Login by username: resolve the auth e-mail for a given username.
create or replace function public.abolivion_login_email(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email::text
  from auth.users u
  join public.abolivion_profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.abolivion_login_email(text) from public;
grant execute on function public.abolivion_login_email(text) to anon, authenticated;
