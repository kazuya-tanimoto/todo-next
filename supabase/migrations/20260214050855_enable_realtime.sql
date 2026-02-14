-- Enable Realtime replication for tables that need live sync
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.list_shares;
