-- PBI-006: Add position column for manual sorting
alter table public.todos add column position integer not null default 0;

-- Set initial positions for existing todos (newest first = lowest position number)
-- This matches the current created_at DESC ordering
with ranked as (
  select id, row_number() over (partition by list_id order by created_at desc) as rn
  from public.todos
)
update public.todos set position = ranked.rn * 1000
from ranked where public.todos.id = ranked.id;

-- Index for efficient ordering by list + position
create index idx_todos_list_position on public.todos (list_id, position);
