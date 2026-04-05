-- PBI-004: ゴミ箱機能（ソフトデリート）
-- deleted_atカラム追加、RLS更新、リスト連動トリガー、pg_cron自動削除

-- 1. deleted_at カラム追加
alter table public.todos add column deleted_at timestamptz;
alter table public.lists add column deleted_at timestamptz;

-- 2. lists: 通常SELECTポリシーに deleted_at IS NULL 条件を追加
drop policy if exists "Users can view own lists" on lists;
drop policy if exists "Users can view shared lists" on lists;

create policy "Users can view own lists"
  on lists for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "Users can view shared lists"
  on lists for select
  using (
    deleted_at is null
    and exists (
      select 1 from list_shares
      where list_shares.list_id = lists.id
      and list_shares.user_id = auth.uid()
    )
  );

-- 3. lists: ゴミ箱用SELECTポリシー（自分が作成したリストのみ）
create policy "Users can view own deleted lists"
  on lists for select
  using (auth.uid() = user_id and deleted_at is not null);

-- 4. lists: DELETEポリシーをゴミ箱内のみに制限
drop policy if exists "Users can delete own lists" on lists;

create policy "Users can delete own lists from trash"
  on lists for delete
  using (auth.uid() = user_id and deleted_at is not null);

-- 5. todos: 通常SELECTポリシーに deleted_at IS NULL 条件を追加
-- (fix_realtime_rls.sql のインラインサブクエリパターンを維持)
drop policy if exists "Users can view todos in accessible lists" on todos;

create policy "Users can view todos in accessible lists"
  on todos for select
  using (
    deleted_at is null
    and (
      exists (
        select 1 from public.lists
        where id = todos.list_id
        and user_id = auth.uid()
      )
      or exists (
        select 1 from public.list_shares
        where list_id = todos.list_id
        and user_id = auth.uid()
      )
    )
  );

-- 6. todos: ゴミ箱用SELECTポリシー
create policy "Users can view deleted todos in accessible lists"
  on todos for select
  using (
    deleted_at is not null
    and (
      exists (
        select 1 from public.lists
        where id = todos.list_id
        and user_id = auth.uid()
      )
      or exists (
        select 1 from public.list_shares
        where list_id = todos.list_id
        and user_id = auth.uid()
      )
    )
  );

-- 7. todos: DELETEポリシーをゴミ箱内のみに制限
drop policy if exists "Users can delete todos in accessible lists" on todos;

create policy "Users can delete todos from trash"
  on todos for delete
  using (
    deleted_at is not null
    and public.has_list_access(list_id)
  );

-- 8. リストソフトデリート時にtodosも連動するトリガー
create or replace function public.soft_delete_list_todos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- リストがソフトデリートされたら、そのリストのtodosもソフトデリート
  if NEW.deleted_at is not null and OLD.deleted_at is null then
    update public.todos
    set deleted_at = NEW.deleted_at
    where list_id = NEW.id and deleted_at is null;
  end if;
  -- リストが復元されたら、同時にソフトデリートされたtodosも復元
  if NEW.deleted_at is null and OLD.deleted_at is not null then
    update public.todos
    set deleted_at = null
    where list_id = NEW.id and deleted_at = OLD.deleted_at;
  end if;
  return NEW;
end;
$$;

create trigger on_list_soft_delete
  after update of deleted_at on public.lists
  for each row execute function public.soft_delete_list_todos();

-- 9. pg_cron: 30日経過アイテムを毎日3時に物理削除
-- pg_cronはホスト環境(Supabase hosted)でのみ利用可能。
-- ローカルでは存在しないためDOで条件分岐する。
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule(
      'cleanup-soft-deleted',
      '0 3 * * *',
      'delete from public.todos where deleted_at < now() - interval ''30 days''; delete from public.lists where deleted_at < now() - interval ''30 days'';'
    );
  end if;
end;
$$;
