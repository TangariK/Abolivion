-- 007: Mural — best_scores guarda ms com casas decimais (Phaser delta);
-- cast direto para bigint falhava e a RPC retornava erro (mural só com fallback local).

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
    coalesce(round((p.best_scores->>'wavesReached')::numeric), 0)::integer as waves_reached,
    coalesce(round((p.best_scores->>'infiniteMs')::numeric), 0)::bigint as infinite_ms,
    coalesce(round((p.best_scores->>'kills')::numeric), 0)::integer as kills,
    greatest(1, coalesce(round((p.best_scores->>'bestLevel')::numeric), 1))::integer as best_level,
    coalesce(round((p.best_scores->>'totalPlayMs')::numeric), 0)::bigint as total_play_ms
  from public.abolivion_profiles p
  where p.mural_visibility in ('public', 'anonymous')
  order by
    case when sort_key = 'time' then coalesce(round((p.best_scores->>'infiniteMs')::numeric), 0) else 0 end desc,
    case when sort_key = 'kills' then coalesce(round((p.best_scores->>'kills')::numeric), 0) else 0 end desc,
    case when sort_key = 'level' then coalesce(round((p.best_scores->>'bestLevel')::numeric), 0) else 0 end desc,
    case when sort_key = 'waves' then coalesce(round((p.best_scores->>'wavesReached')::numeric), 0) else 0 end desc,
    coalesce(round((p.best_scores->>'wavesReached')::numeric), 0) desc,
    coalesce(round((p.best_scores->>'kills')::numeric), 0) desc
  limit lim;
end;
$$;

revoke all on function public.abolivion_mural_entries(text, integer) from public;
grant execute on function public.abolivion_mural_entries(text, integer) to anon, authenticated;
