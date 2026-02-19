-- PBI-002: 共有メンバーの可視化
-- get_list_members RPCを拡張:
-- 1. オーナー+共有メンバー両方が呼べるように変更
-- 2. オーナー自身も結果に含める
-- 3. is_ownerカラムを追加

drop function if exists public.get_list_members(uuid);
create function public.get_list_members(_list_id uuid)
returns table (user_id uuid, email text, display_name text, is_owner boolean)
language sql
security definer
set search_path = ''
as $$
  -- Owner
  select l.user_id, u.email, p.display_name, true as is_owner
  from public.lists l
  join auth.users u on u.id = l.user_id
  left join public.profiles p on p.id = l.user_id
  where l.id = _list_id
    and (
      l.user_id = auth.uid()
      or exists (select 1 from public.list_shares where list_id = _list_id and user_id = auth.uid())
    )
  union all
  -- Shared members
  select ls.user_id, u.email, p.display_name, false as is_owner
  from public.list_shares ls
  join auth.users u on u.id = ls.user_id
  left join public.profiles p on p.id = ls.user_id
  where ls.list_id = _list_id
    and (
      exists (select 1 from public.lists where id = _list_id and user_id = auth.uid())
      or exists (select 1 from public.list_shares where list_id = _list_id and user_id = auth.uid())
    );
$$;
