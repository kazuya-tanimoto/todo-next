-- Fix: RLS infinite recursion between lists ↔ list_shares
--
-- Problem: lists SELECT policy queries list_shares, whose ALL policy
-- queries lists back → infinite recursion (error 42P17).
--
-- Solution: Use a SECURITY DEFINER function to check list ownership
-- without triggering RLS on the lists table.

create or replace function public.is_list_owner(_list_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lists
    where id = _list_id
    and user_id = auth.uid()
  );
$$;

-- Drop the recursive list_shares policy
drop policy "List owners can manage shares" on list_shares;

-- Recreate using the security definer function (no RLS re-entry on lists)
create policy "List owners can manage shares"
  on list_shares for all
  using (public.is_list_owner(list_id));

-- Also fix todos policies that reference lists (same recursion path:
-- todos → lists SELECT → list_shares → lists SELECT → ...)
drop policy "Users can view todos in own lists" on todos;
drop policy "Users can create todos in own lists" on todos;
drop policy "Users can update todos in own lists" on todos;
drop policy "Users can delete todos in own lists" on todos;

create policy "Users can view todos in own lists"
  on todos for select
  using (public.is_list_owner(list_id));

create policy "Users can create todos in own lists"
  on todos for insert
  with check (public.is_list_owner(list_id));

create policy "Users can update todos in own lists"
  on todos for update
  using (public.is_list_owner(list_id));

create policy "Users can delete todos in own lists"
  on todos for delete
  using (public.is_list_owner(list_id));
