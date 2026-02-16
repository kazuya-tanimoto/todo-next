-- Fix: Realtime (WALRUS) does not deliver postgres_changes events
--
-- Root cause: SELECT RLS policies use SECURITY DEFINER functions
-- (has_list_access, is_list_owner). WALRUS impersonates subscribers via
-- set_config('role', ...) before evaluating SELECT policies, but
-- SECURITY DEFINER switches the role to postgres, which may interfere
-- with WALRUS's auth context on the hosted platform.
--
-- Fix: Remove SECURITY DEFINER from all SELECT policy paths.
--   1. Split list_shares "for all" policy into per-operation policies
--      so that SELECT on list_shares uses only auth.uid() = user_id
--      (no SECURITY DEFINER, no recursion).
--   2. Replace todos SELECT policy to use inline subqueries instead
--      of has_list_access() SECURITY DEFINER function.
--   3. Keep has_list_access() for INSERT/UPDATE/DELETE (not evaluated
--      by Realtime, works fine with REST API).

-- Step 1: Split list_shares "for all" into per-operation policies
-- The "for all" policy uses is_list_owner() SECURITY DEFINER which
-- causes recursion when evaluated during SELECT: list_shares SELECT
-- → is_list_owner() → lists SELECT → "Users can view shared lists"
-- → list_shares SELECT → ∞ (broken by SECURITY DEFINER bypass, but
-- this bypass doesn't work correctly with Realtime WALRUS).

drop policy if exists "List owners can manage shares" on list_shares;

create policy "List owners can insert shares"
  on list_shares for insert
  with check (public.is_list_owner(list_id));

create policy "List owners can update shares"
  on list_shares for update
  using (public.is_list_owner(list_id));

-- Note: "Users can view own shares" (SELECT) already exists: auth.uid() = user_id
-- Note: "Users can leave shared lists" (DELETE) already exists: auth.uid() = user_id
-- Owner DELETE is covered by adding a new policy:
create policy "List owners can delete shares"
  on list_shares for delete
  using (public.is_list_owner(list_id));

-- Step 2: Replace todos SELECT policy with inline subqueries
-- Now safe because list_shares SELECT only checks auth.uid() = user_id
-- (no recursion back to lists).

drop policy if exists "Users can view todos in accessible lists" on todos;

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
