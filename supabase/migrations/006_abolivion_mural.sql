-- 006: Mural da Tribo — visibilidade + leitura pública segura dos recordes
-- Safe on shared project: only touches abolivion_* objects.

alter table public.abolivion_profiles
  add column if not exists mural_visibility text not null default 'public',
  add column if not exists mural_alias text;

alter table public.abolivion_profiles
  drop constraint if exists abolivion_profiles_mural_visibility_check;
alter table public.abolivion_profiles
  add constraint abolivion_profiles_mural_visibility_check
  check (mural_visibility in ('public', 'anonymous', 'invisible'));

-- RPC: lista recordes sem expor perfis invisíveis / sem vazar dados sensíveis
create or replace function public.abolivion_mural_entries(
  p_sort text default 'waves',
  p_limit integer default 25
)
returns table (
  display_name text,
  waves_reached integer,
  infinite_ms bigint,
  kills integer,
  best_level integer,
  total_play_ms bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  lim integer := greatest(1, least(coalesce(p_limit, 25), 50));
  sort_key text := lower(coalesce(p_sort, 'waves'));
begin
  return query
  select
    case
      when p.mural_visibility = 'anonymous' then coalesce(nullif(p.mural_alias, ''), 'arvore_00')
      else coalesce(nullif(p.username, ''), nullif(p.display_name, ''), 'Caçador')
    end as display_name,
    coalesce((p.best_scores->>'wavesReached')::integer, 0) as waves_reached,
    coalesce((p.best_scores->>'infiniteMs')::bigint, 0) as infinite_ms,
    coalesce((p.best_scores->>'kills')::integer, 0) as kills,
    coalesce((p.best_scores->>'bestLevel')::integer, 1) as best_level,
    coalesce((p.best_scores->>'totalPlayMs')::bigint, 0) as total_play_ms
  from public.abolivion_profiles p
  where p.mural_visibility in ('public', 'anonymous')
  order by
    case when sort_key = 'time' then coalesce((p.best_scores->>'infiniteMs')::bigint, 0) else 0 end desc,
    case when sort_key = 'kills' then coalesce((p.best_scores->>'kills')::integer, 0) else 0 end desc,
    case when sort_key = 'level' then coalesce((p.best_scores->>'bestLevel')::integer, 0) else 0 end desc,
    case when sort_key = 'waves' then coalesce((p.best_scores->>'wavesReached')::integer, 0) else 0 end desc,
    coalesce((p.best_scores->>'wavesReached')::integer, 0) desc,
    coalesce((p.best_scores->>'kills')::integer, 0) desc
  limit lim;
end;
$$;

revoke all on function public.abolivion_mural_entries(text, integer) from public;
grant execute on function public.abolivion_mural_entries(text, integer) to anon, authenticated;
