alter table public.todos add column description text check (char_length(description) <= 10000);
