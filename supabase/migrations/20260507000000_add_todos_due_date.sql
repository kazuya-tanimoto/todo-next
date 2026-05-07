-- PBI-009: Todoの期限設定
alter table public.todos add column due_date timestamptz;
create index todos_due_date_idx on public.todos (list_id, due_date) where deleted_at is null;
