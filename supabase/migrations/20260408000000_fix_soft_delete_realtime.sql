-- Fix: Realtime does not deliver soft-delete UPDATE events
--
-- Root cause: SELECT policies with `deleted_at IS NULL` condition cause
-- WALRUS to skip UPDATE events where the new row has `deleted_at IS NOT NULL`,
-- because the updated row no longer matches the SELECT policy.
--
-- Fix: Remove `deleted_at` conditions from SELECT policies (restore to
-- pre-soft-delete state). Filter deleted items in application queries instead.
-- This ensures Realtime delivers all UPDATE events including soft-deletes.

-- 1. lists: restore SELECT policies without deleted_at condition
drop policy if exists "Users can view own lists" on lists;
drop policy if exists "Users can view shared lists" on lists;
drop policy if exists "Users can view own deleted lists" on lists;

create policy "Users can view own lists"
  on lists for select
  using (auth.uid() = user_id);

create policy "Users can view shared lists"
  on lists for select
  using (
    exists (
      select 1 from list_shares
      where list_shares.list_id = lists.id
      and list_shares.user_id = auth.uid()
    )
  );

-- 2. todos: restore SELECT policy without deleted_at condition
-- (inline subqueries for Realtime WALRUS compatibility)
drop policy if exists "Users can view todos in accessible lists" on todos;
drop policy if exists "Users can view deleted todos in accessible lists" on todos;

create policy "Users can view todos in accessible lists"
  on todos for select
  using (
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
  );
