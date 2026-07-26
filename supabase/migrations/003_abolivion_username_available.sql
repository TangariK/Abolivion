-- 003: checagem de usuário disponível antes do cadastro
-- Safe on shared project: only touches abolivion_* objects.

create or replace function public.abolivion_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1
    from public.abolivion_profiles p
    where lower(p.username) = lower(p_username)
  );
$$;

revoke all on function public.abolivion_username_available(text) from public;
grant execute on function public.abolivion_username_available(text) to anon, authenticated;
