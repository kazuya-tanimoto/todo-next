-- PBI-001: User profiles (display name / nickname)
--
-- Adds a profiles table so users can set a display name
-- instead of showing email addresses in shared lists.

-- 1. profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Any authenticated user can read profiles (needed for shared list member names)
create policy "Authenticated users can read profiles"
  on profiles for select
  using (auth.uid() is not null);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- 2. Update get_list_members RPC to include display_name
-- Must DROP first because return type is changing (adding display_name column)
drop function if exists public.get_list_members(uuid);
create function public.get_list_members(_list_id uuid)
returns table (user_id uuid, email text, display_name text)
language sql
security definer
set search_path = ''
as $$
  select ls.user_id, u.email, p.display_name
  from public.list_shares ls
  join auth.users u on u.id = ls.user_id
  left join public.profiles p on p.id = ls.user_id
  where ls.list_id = _list_id
    and exists (
      select 1 from public.lists
      where id = _list_id and user_id = auth.uid()
    );
$$;
