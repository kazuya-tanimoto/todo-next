-- Invite tokens for link-based list sharing
--
-- Flow: List owner creates invite token → shares URL → recipient opens URL → accepts invite
-- This avoids email-based user lookup (privacy risk).

-- 0. Enable pgcrypto for gen_random_bytes (used in token generation)
create extension if not exists pgcrypto with schema extensions;

-- 1. invite_tokens table
create table invite_tokens (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade not null,
  token text unique not null default encode(extensions.gen_random_bytes(32), 'hex'),
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days'),
  is_active boolean default true
);

alter table invite_tokens enable row level security;

-- List owners can manage their invite tokens
create policy "List owners can manage invite tokens"
  on invite_tokens for all
  using (public.is_list_owner(list_id));

-- Any authenticated user can view active tokens (needed for accepting invites)
create policy "Users can view active invite tokens"
  on invite_tokens for select
  using (is_active = true and expires_at > now());

-- 2. has_list_access() function: checks if user is owner OR shared member
create or replace function public.has_list_access(_list_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lists
    where id = _list_id and user_id = auth.uid()
  )
  or exists (
    select 1 from public.list_shares
    where list_id = _list_id and user_id = auth.uid()
  );
$$;

-- 3. Update todos RLS: allow shared users full CRUD
-- Drop existing policies (from fix_rls_recursion migration + initial migration)
drop policy if exists "Users can view todos in own lists" on todos;
drop policy if exists "Users can view todos in shared lists" on todos;
drop policy if exists "Users can create todos in own lists" on todos;
drop policy if exists "Users can update todos in own lists" on todos;
drop policy if exists "Users can delete todos in own lists" on todos;

-- Recreate with has_list_access (covers both owner and shared users)
create policy "Users can view todos in accessible lists"
  on todos for select
  using (public.has_list_access(list_id));

create policy "Users can create todos in accessible lists"
  on todos for insert
  with check (public.has_list_access(list_id));

create policy "Users can update todos in accessible lists"
  on todos for update
  using (public.has_list_access(list_id));

create policy "Users can delete todos in accessible lists"
  on todos for delete
  using (public.has_list_access(list_id));

-- 4. accept_invite() RPC function
create or replace function public.accept_invite(_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_list_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Find active, non-expired token
  select list_id into v_list_id
  from public.invite_tokens
  where token = _token
    and is_active = true
    and expires_at > now();

  if v_list_id is null then
    raise exception 'Invalid or expired invite token';
  end if;

  -- Don't share with the list owner
  if exists (select 1 from public.lists where id = v_list_id and user_id = v_user_id) then
    raise exception 'You already own this list';
  end if;

  -- Insert share (ignore if already shared)
  insert into public.list_shares (list_id, user_id)
  values (v_list_id, v_user_id)
  on conflict do nothing;

  return v_list_id;
end;
$$;

-- 5. get_list_members() RPC: returns shared members with email (for list owners)
create or replace function public.get_list_members(_list_id uuid)
returns table (user_id uuid, email text)
language sql
security definer
set search_path = ''
as $$
  select ls.user_id, u.email
  from public.list_shares ls
  join auth.users u on u.id = ls.user_id
  where ls.list_id = _list_id
    and exists (
      select 1 from public.lists
      where id = _list_id and user_id = auth.uid()
    );
$$;

-- 6. Additional list_shares policies for shared users
-- Shared users can view their own share entries
create policy "Users can view own shares"
  on list_shares for select
  using (auth.uid() = user_id);

-- Shared users can leave (delete their own share)
create policy "Users can leave shared lists"
  on list_shares for delete
  using (auth.uid() = user_id);
