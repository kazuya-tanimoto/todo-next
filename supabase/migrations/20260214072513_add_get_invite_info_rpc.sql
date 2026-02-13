-- get_invite_info: Allows any authenticated user to look up invite details
-- without needing list access (needed before accepting the invite).

create or replace function public.get_invite_info(_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list_name text;
  v_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select it.list_id, l.name
  into v_list_id, v_list_name
  from public.invite_tokens it
  join public.lists l on l.id = it.list_id
  where it.token = _token
    and it.is_active = true
    and it.expires_at > now();

  if v_list_id is null then
    return null;
  end if;

  return json_build_object('list_id', v_list_id, 'list_name', v_list_name);
end;
$$;
