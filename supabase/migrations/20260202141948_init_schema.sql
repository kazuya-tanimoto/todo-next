-- リスト
create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- TODO
create table todos (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade not null,
  text text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- リスト共有（将来）
create table list_shares (
  list_id uuid references lists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (list_id, user_id)
);

-- Row Level Security
alter table lists enable row level security;
alter table todos enable row level security;
alter table list_shares enable row level security;

-- リストポリシー: 自分が作成したリスト、または共有されたリストを表示
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

create policy "Users can create own lists"
  on lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lists"
  on lists for update
  using (auth.uid() = user_id);

create policy "Users can delete own lists"
  on lists for delete
  using (auth.uid() = user_id);

-- TODOポリシー: 所属リストの権限に従う
create policy "Users can view todos in own lists"
  on todos for select
  using (
    exists (
      select 1 from lists
      where lists.id = todos.list_id
      and lists.user_id = auth.uid()
    )
  );

create policy "Users can view todos in shared lists"
  on todos for select
  using (
    exists (
      select 1 from list_shares
      where list_shares.list_id = todos.list_id
      and list_shares.user_id = auth.uid()
    )
  );

create policy "Users can create todos in own lists"
  on todos for insert
  with check (
    exists (
      select 1 from lists
      where lists.id = todos.list_id
      and lists.user_id = auth.uid()
    )
  );

create policy "Users can update todos in own lists"
  on todos for update
  using (
    exists (
      select 1 from lists
      where lists.id = todos.list_id
      and lists.user_id = auth.uid()
    )
  );

create policy "Users can delete todos in own lists"
  on todos for delete
  using (
    exists (
      select 1 from lists
      where lists.id = todos.list_id
      and lists.user_id = auth.uid()
    )
  );

-- 共有ポリシー: リストオーナーのみ共有設定可能
create policy "List owners can manage shares"
  on list_shares for all
  using (
    exists (
      select 1 from lists
      where lists.id = list_shares.list_id
      and lists.user_id = auth.uid()
    )
  );
