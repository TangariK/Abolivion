-- 004: restaura grants do sync + protege role via trigger
-- A migration 002 fez REVOKE UPDATE na tabela e só liberou colunas.
-- O trigger de updated_at precisa de UPDATE em updated_at; sem isso o
-- PostgREST upsert quebra com 42501 (permission denied).

-- Protege role: cliente autenticado nunca consegue elevar privilégio
create or replace function public.abolivion_protect_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  if tg_op = 'INSERT' and new.role is distinct from 'player' then
    new.role := 'player';
  end if;
  return new;
end;
$$;

drop trigger if exists abolivion_profiles_protect_role on public.abolivion_profiles;
create trigger abolivion_profiles_protect_role
  before insert or update on public.abolivion_profiles
  for each row
  execute function public.abolivion_protect_role();

-- Grants de tabela (RLS continua limitando à própria linha)
grant select, insert, update, delete on public.abolivion_profiles to authenticated;

-- Garante SELECT também (upsert / merge usa leitura)
grant select on public.abolivion_profiles to authenticated;
