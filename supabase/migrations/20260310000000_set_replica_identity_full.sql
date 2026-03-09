-- Enable REPLICA IDENTITY FULL for Realtime DELETE events with RLS
--
-- Without FULL, DELETE events only contain the primary key in `old`,
-- which prevents Realtime from evaluating RLS policies to determine
-- which subscribers should receive the event.

ALTER TABLE public.todos REPLICA IDENTITY FULL;
ALTER TABLE public.lists REPLICA IDENTITY FULL;
ALTER TABLE public.list_shares REPLICA IDENTITY FULL;
ALTER TABLE public.tags REPLICA IDENTITY FULL;
ALTER TABLE public.todo_tags REPLICA IDENTITY FULL;
