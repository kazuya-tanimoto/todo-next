"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import { Todo, Tag } from "@/types";
import { TagColorKey } from "@/lib/tagColors";
import TodoList from "./TodoList";
import TagFilter from "./TagFilter";
import TagSelector from "./TagSelector";

interface Props {
  selectedListId: string | null;
}

export default function TodoSection({ selectedListId }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedListId) {
      setTodos([]);
      setTags([]);
      setSelectedTagIds(new Set());
      setPendingTagIds([]);
      return;
    }

    let ignore = false;
    const supabase = createClient();
    let todosChannel: ReturnType<typeof supabase.channel> | null = null;
    let tagsChannel: ReturnType<typeof supabase.channel> | null = null;
    let todoTagsChannel: ReturnType<typeof supabase.channel> | null = null;

    const hydrateTodoTags = async (
      todosToHydrate: Todo[],
      tagsForList: Tag[]
    ): Promise<Todo[]> => {
      if (todosToHydrate.length === 0) return todosToHydrate;

      const todoIds = todosToHydrate.map((t) => t.id);
      const { data: todoTags } = await supabase
        .from("todo_tags")
        .select("todo_id, tag_id")
        .in("todo_id", todoIds);

      if (!todoTags) return todosToHydrate;

      const tagMap = new Map(tagsForList.map((t) => [t.id, t]));
      const todoTagMap = new Map<string, Tag[]>();
      for (const tt of todoTags) {
        const tag = tagMap.get(tt.tag_id);
        if (tag) {
          const existing = todoTagMap.get(tt.todo_id) ?? [];
          existing.push(tag);
          todoTagMap.set(tt.todo_id, existing);
        }
      }

      return todosToHydrate.map((todo) => ({
        ...todo,
        tags: todoTagMap.get(todo.id) ?? [],
      }));
    };

    const init = async () => {
      setIsLoading(true);
      setSelectedTagIds(new Set());
      setPendingTagIds([]);

      const [todosResult, tagsResult] = await Promise.all([
        supabase
          .from("todos")
          .select("*")
          .eq("list_id", selectedListId)
          .order("created_at", { ascending: false }),
        supabase
          .from("tags")
          .select("*")
          .eq("list_id", selectedListId)
          .order("created_at", { ascending: true }),
        ensureRealtimeAuth(supabase),
      ]);

      if (ignore) return;

      const fetchedTags = tagsResult.data ?? [];
      setTags(fetchedTags);

      if (!todosResult.error && todosResult.data) {
        const hydrated = await hydrateTodoTags(todosResult.data, fetchedTags);
        if (!ignore) setTodos(hydrated);
      }
      setIsLoading(false);

      // Todos realtime
      todosChannel = supabase
        .channel(`todos:${selectedListId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "todos",
            filter: `list_id=eq.${selectedListId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newTodo = { ...(payload.new as Todo), tags: [] };
              setTodos((prev) =>
                prev.some((t) => t.id === newTodo.id)
                  ? prev
                  : [newTodo, ...prev]
              );
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as Todo;
              setTodos((prev) =>
                prev.map((t) =>
                  t.id === updated.id ? { ...t, ...updated } : t
                )
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setTodos((prev) => prev.filter((t) => t.id !== deleted.id));
            }
          }
        )
        .subscribe();

      // Tags realtime
      tagsChannel = supabase
        .channel(`tags:${selectedListId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tags",
            filter: `list_id=eq.${selectedListId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newTag = payload.new as Tag;
              setTags((prev) =>
                prev.some((t) => t.id === newTag.id)
                  ? prev
                  : [...prev, newTag]
              );
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as Tag;
              setTags((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              );
              setTodos((prev) =>
                prev.map((todo) => ({
                  ...todo,
                  tags: todo.tags?.map((t) =>
                    t.id === updated.id ? updated : t
                  ),
                }))
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setTags((prev) => prev.filter((t) => t.id !== deleted.id));
              setSelectedTagIds((prev) => {
                const next = new Set(prev);
                next.delete(deleted.id);
                return next;
              });
              setTodos((prev) =>
                prev.map((todo) => ({
                  ...todo,
                  tags: todo.tags?.filter((t) => t.id !== deleted.id),
                }))
              );
            }
          }
        )
        .subscribe();

      // todo_tags realtime — no list_id filter available
      todoTagsChannel = supabase
        .channel(`todo_tags:${selectedListId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "todo_tags" },
          async (payload) => {
            const todoId =
              payload.eventType === "DELETE"
                ? (payload.old as { todo_id: string }).todo_id
                : (payload.new as { todo_id: string }).todo_id;

            // Only process if this todo is in our current list
            setTodos((prev) => {
              if (!prev.some((t) => t.id === todoId)) return prev;

              // Refetch todo_tags for this specific todo
              supabase
                .from("todo_tags")
                .select("tag_id")
                .eq("todo_id", todoId)
                .then(({ data }) => {
                  if (!data) return;
                  setTags((currentTags) => {
                    const tagMap = new Map(currentTags.map((t) => [t.id, t]));
                    const todoTagList = data
                      .map((tt) => tagMap.get(tt.tag_id))
                      .filter((t): t is Tag => !!t);
                    setTodos((p) =>
                      p.map((t) =>
                        t.id === todoId ? { ...t, tags: todoTagList } : t
                      )
                    );
                    return currentTags;
                  });
                });
              return prev;
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      ignore = true;
      if (todosChannel) supabase.removeChannel(todosChannel);
      if (tagsChannel) supabase.removeChannel(tagsChannel);
      if (todoTagsChannel) supabase.removeChannel(todoTagsChannel);
    };
  }, [selectedListId]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedListId) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("todos")
      .insert({ list_id: selectedListId, text: inputValue.trim() })
      .select()
      .single();

    if (!error && data) {
      let todoTags: Tag[] = [];
      if (pendingTagIds.length > 0) {
        const rows = pendingTagIds.map((tagId) => ({
          todo_id: data.id,
          tag_id: tagId,
        }));
        await supabase.from("todo_tags").insert(rows);
        const tagMap = new Map(tags.map((t) => [t.id, t]));
        todoTags = pendingTagIds
          .map((id) => tagMap.get(id))
          .filter((t): t is Tag => !!t);
      }
      setTodos((prev) => [{ ...data, tags: todoTags }, ...prev]);
      setInputValue("");
      setPendingTagIds([]);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id);

    if (!error) {
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, completed: !completed } : todo
        )
      );
    }
  };

  const deleteTodo = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (!error) {
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    }
  };

  const clearCompleted = async () => {
    if (!selectedListId) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("list_id", selectedListId)
      .eq("completed", true);

    if (!error) {
      setTodos((prev) => prev.filter((t) => !t.completed));
    }
  };

  // Tag CRUD
  const createTag = async (name: string, color: TagColorKey) => {
    if (!selectedListId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tags")
      .insert({ list_id: selectedListId, name, color })
      .select()
      .single();

    if (!error && data) {
      setTags((prev) => [...prev, data]);
    }
  };

  const updateTag = async (id: string, name: string, color: TagColorKey) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tags")
      .update({ name, color })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      setTags((prev) => prev.map((t) => (t.id === id ? data : t)));
      setTodos((prev) =>
        prev.map((todo) => ({
          ...todo,
          tags: todo.tags?.map((t) => (t.id === id ? data : t)),
        }))
      );
    }
  };

  const deleteTag = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("tags").delete().eq("id", id);

    if (!error) {
      setTags((prev) => prev.filter((t) => t.id !== id));
      setSelectedTagIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setTodos((prev) =>
        prev.map((todo) => ({
          ...todo,
          tags: todo.tags?.filter((t) => t.id !== id),
        }))
      );
    }
  };

  const toggleFilterTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const togglePendingTag = (tagId: string) => {
    setPendingTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const filteredTodos = useMemo(
    () =>
      selectedTagIds.size === 0
        ? todos
        : todos.filter((t) =>
            t.tags?.some((tag) => selectedTagIds.has(tag.id))
          ),
    [todos, selectedTagIds]
  );

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  if (!selectedListId) {
    return (
      <div className="theme-card p-8 text-center">
        <div className="mb-2 text-4xl">📋</div>
        <p className="text-[var(--fg-secondary)]">Select a list to get started</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-[var(--fg-secondary)] mb-4">
        {totalCount === 0
          ? "No tasks yet. Add something!"
          : `${completedCount}/${totalCount} completed`}
      </p>

      {/* Tag Filter */}
      <TagFilter
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggle={toggleFilterTag}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
      />

      {/* Input Form */}
      <form onSubmit={addTodo} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What needs to be done?"
            className="theme-input flex-1 px-4 py-3 text-lg"
          />
          <button
            type="submit"
            className="theme-btn px-6 py-3"
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
        <TagSelector
          tags={tags}
          selectedTagIds={pendingTagIds}
          onToggle={togglePendingTag}
        />
      </form>

      {/* Todo List */}
      <TodoList
        todos={filteredTodos}
        isLoading={isLoading}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />

      {/* Footer */}
      {completedCount > 0 && (
        <div className="mt-8">
          <button
            onClick={clearCompleted}
            className="theme-btn px-4 py-2 text-sm"
          >
            Clear completed ({completedCount})
          </button>
        </div>
      )}
    </>
  );
}
