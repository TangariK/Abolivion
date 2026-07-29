-- 005: salas online (matchmaking). Prefixo abolivion_ no projeto compartilhado.

create extension if not exists pgcrypto;

create table if not exists public.abolivion_rooms (
  code text primary key check (char_length(code) = 6),
  host_uid uuid references auth.users (id) on delete set null,
  host_guest_id text,
  host_display_name text not null,
  is_public boolean not null default true,
  password_hash text,
  game_mode text not null check (game_mode in ('infinite', 'waves')),
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists abolivion_rooms_waiting_public_idx
  on public.abolivion_rooms (created_at desc)
  where status = 'waiting' and is_public = true;

drop trigger if exists abolivion_rooms_set_updated_at on public.abolivion_rooms;
create trigger abolivion_rooms_set_updated_at
  before update on public.abolivion_rooms
  for each row
  execute function public.abolivion_set_updated_at();

alter table public.abolivion_rooms enable row level security;

drop policy if exists "abolivion_rooms_select_waiting" on public.abolivion_rooms;
create policy "abolivion_rooms_select_waiting"
  on public.abolivion_rooms
  for select
  to anon, authenticated
  using (status in ('waiting', 'playing'));

drop policy if exists "abolivion_rooms_insert" on public.abolivion_rooms;
create policy "abolivion_rooms_insert"
  on public.abolivion_rooms
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "abolivion_rooms_update" on public.abolivion_rooms;
create policy "abolivion_rooms_update"
  on public.abolivion_rooms
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "abolivion_rooms_delete" on public.abolivion_rooms;
create policy "abolivion_rooms_delete"
  on public.abolivion_rooms
  for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on public.abolivion_rooms to anon, authenticated;
-- Hash de senha não deve ir ao cliente
revoke select (password_hash) on public.abolivion_rooms from anon, authenticated;

create or replace function public.abolivion_list_rooms()
returns table (
  code text,
  host_display_name text,
  is_public boolean,
  game_mode text,
  created_at timestamptz,
  has_password boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.code,
    r.host_display_name,
    r.is_public,
    r.game_mode,
    r.created_at,
    (r.password_hash is not null) as has_password
  from public.abolivion_rooms r
  where r.status = 'waiting'
  order by r.is_public desc, r.created_at desc
  limit 40;
$$;

grant execute on function public.abolivion_list_rooms() to anon, authenticated;

create or replace function public.abolivion_room_check_password(p_code text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  stored text;
begin
  select password_hash into stored
  from public.abolivion_rooms
  where code = upper(trim(p_code)) and status = 'waiting';
  if not found then
    return false;
  end if;
  if stored is null then
    return true;
  end if;
  return stored = encode(digest(coalesce(p_password, ''), 'sha256'), 'hex');
end;
$$;

grant execute on function public.abolivion_room_check_password(text, text) to anon, authenticated;
