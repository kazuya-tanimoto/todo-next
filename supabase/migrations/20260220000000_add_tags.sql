-- PBI-005: Tags feature
-- Add tags (per-list) and todo_tags (junction) tables

-- 1. tags table
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references public.lists(id) on delete cascade not null,
  name text not null,
  color text not null,
  created_at timestamptz default now()
);

-- 2. todo_tags junction table
create table public.todo_tags (
  todo_id uuid references public.todos(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (todo_id, tag_id)
);

-- 3. RLS
alter table public.tags enable row level security;
alter table public.todo_tags enable row level security;

-- tags SELECT: inline subqueries (no SECURITY DEFINER) for Realtime WALRUS compatibility
-- Pattern from: 20260215080000_fix_realtime_rls.sql
create policy "Users can view tags in accessible lists"
  on public.tags for select
  using (
    exists (
      select 1 from public.lists
      where id = tags.list_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.list_shares
      where list_id = tags.list_id and user_id = auth.uid()
    )
  );

-- tags INSERT/UPDATE/DELETE: use has_list_access() SECURITY DEFINER
create policy "Users can create tags in accessible lists"
  on public.tags for insert
  with check (public.has_list_access(list_id));

create policy "Users can update tags in accessible lists"
  on public.tags for update
  using (public.has_list_access(list_id));

create policy "Users can delete tags in accessible lists"
  on public.tags for delete
  using (public.has_list_access(list_id));

-- todo_tags SELECT: inline subqueries via tags -> lists/list_shares
create policy "Users can view todo_tags in accessible lists"
  on public.todo_tags for select
  using (
    exists (
      select 1 from public.tags t
      where t.id = todo_tags.tag_id
        and (
          exists (
            select 1 from public.lists
            where id = t.list_id and user_id = auth.uid()
          )
          or exists (
            select 1 from public.list_shares
            where list_id = t.list_id and user_id = auth.uid()
          )
        )
    )
  );

-- todo_tags INSERT/DELETE: via has_list_access on the tag's list_id
-- No UPDATE policy needed — PK is the relationship itself
create policy "Users can insert todo_tags in accessible lists"
  on public.todo_tags for insert
  with check (
    exists (
      select 1 from public.tags
      where id = todo_tags.tag_id
        and public.has_list_access(list_id)
    )
  );

create policy "Users can delete todo_tags in accessible lists"
  on public.todo_tags for delete
  using (
    exists (
      select 1 from public.tags
      where id = todo_tags.tag_id
        and public.has_list_access(list_id)
    )
  );

-- 4. Enable Realtime
alter publication supabase_realtime add table public.tags;
alter publication supabase_realtime add table public.todo_tags;
