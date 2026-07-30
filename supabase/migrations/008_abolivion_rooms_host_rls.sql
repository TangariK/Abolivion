-- 008: salas — só o host pode UPDATE/DELETE
-- Conta logada: host_uid = auth.uid()
-- Host convidado: RPC com guest_id

drop policy if exists "abolivion_rooms_update" on public.abolivion_rooms;
create policy "abolivion_rooms_update"
  on public.abolivion_rooms
  for update
  to authenticated
  using (host_uid is not null and host_uid = auth.uid())
  with check (host_uid is not null and host_uid = auth.uid());

-- Anon não atualiza direto a tabela (usa RPC)
drop policy if exists "abolivion_rooms_delete" on public.abolivion_rooms;
create policy "abolivion_rooms_delete"
  on public.abolivion_rooms
  for delete
  to authenticated
  using (host_uid is not null and host_uid = auth.uid());

-- Remover grants amplos de update/delete para anon
revoke update, delete on public.abolivion_rooms from anon;
grant update, delete on public.abolivion_rooms to authenticated;

create or replace function public.abolivion_room_host_mutate(
  p_code text,
  p_guest_id text,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  room_code text := upper(trim(p_code));
  action text := lower(trim(coalesce(p_action, '')));
  matched boolean := false;
begin
  if action not in ('playing', 'waiting', 'closed', 'delete') then
    return false;
  end if;

  -- Conta autenticada dona da sala
  if auth.uid() is not null then
    if action = 'delete' then
      delete from public.abolivion_rooms
      where code = room_code and host_uid = auth.uid();
      return found;
    end if;
    update public.abolivion_rooms
    set status = action
    where code = room_code and host_uid = auth.uid();
    return found;
  end if;

  -- Host convidado: precisa do guest_id correto
  if p_guest_id is null or length(trim(p_guest_id)) < 8 then
    return false;
  end if;

  if action = 'delete' then
    delete from public.abolivion_rooms
    where code = room_code
      and host_uid is null
      and host_guest_id = p_guest_id;
    return found;
  end if;

  update public.abolivion_rooms
  set status = action
  where code = room_code
    and host_uid is null
    and host_guest_id = p_guest_id;
  return found;
end;
$$;

revoke all on function public.abolivion_room_host_mutate(text, text, text) from public;
grant execute on function public.abolivion_room_host_mutate(text, text, text) to anon, authenticated;
