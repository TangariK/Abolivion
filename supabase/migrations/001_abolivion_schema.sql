-- Abolivion cloud profiles (Auth + RLS)
-- Safe to run on a shared Supabase project: only creates abolivion_* objects.

create extension if not exists "pgcrypto";

create table if not exists public.abolivion_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency integer not null default 0 check (currency >= 0),
  meta_levels jsonb not null default '{"maxHp":0,"speed":0,"damage":0,"fireRate":0}'::jsonb,
  almanac jsonb not null default '{"enemies":[],"amulets":[],"upgrades":[],"bosses":[],"achievements":[]}'::jsonb,
  best_scores jsonb not null default '{"infiniteMs":0,"wavesReached":0,"kills":0}'::jsonb,
  profile_version integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists abolivion_profiles_updated_at_idx
  on public.abolivion_profiles (updated_at desc);

alter table public.abolivion_profiles enable row level security;

drop policy if exists "abolivion_profiles_select_own" on public.abolivion_profiles;
create policy "abolivion_profiles_select_own"
  on public.abolivion_profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "abolivion_profiles_insert_own" on public.abolivion_profiles;
create policy "abolivion_profiles_insert_own"
  on public.abolivion_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "abolivion_profiles_update_own" on public.abolivion_profiles;
create policy "abolivion_profiles_update_own"
  on public.abolivion_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "abolivion_profiles_delete_own" on public.abolivion_profiles;
create policy "abolivion_profiles_delete_own"
  on public.abolivion_profiles
  for delete
  to authenticated
  using (auth.uid() = id);

create or replace function public.abolivion_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists abolivion_profiles_set_updated_at on public.abolivion_profiles;
create trigger abolivion_profiles_set_updated_at
  before update on public.abolivion_profiles
  for each row
  execute function public.abolivion_set_updated_at();

-- Auto-create empty cloud profile when a user signs up
create or replace function public.abolivion_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abolivion_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists abolivion_on_auth_user_created on auth.users;
create trigger abolivion_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.abolivion_handle_new_user();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.abolivion_profiles to authenticated;
