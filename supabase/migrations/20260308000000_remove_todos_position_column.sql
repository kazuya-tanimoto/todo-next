-- Fix: Remove position column from todos table
-- This column was added directly to production DB but is not used in the codebase.
alter table public.todos drop column if exists position;
