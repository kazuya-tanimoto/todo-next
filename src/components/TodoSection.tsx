"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import { Todo, Tag, SortMode } from "@/types";
import { TagColorKey } from "@/lib/tagColors";
import TodoList from "./TodoList";
import TagFilter from "./TagFilter";
import TagSelector from "./TagSelector";
import SortSelector from "./SortSelector";

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
  const [sortMode, setSortMode] = useState<SortMode>("manual");

  useEffect(() => {
    if (!selectedListId) {
      setTodos([]);
      setTags([]);
      setSelectedTagIds(new Set());
      setPendingTagIds([]);
      return;
    }

    const savedSort = localStorage.getItem(`sortMode:${selectedListId}`);
    if (savedSort && ["manual", "created", "name", "completed"].includes(savedSort)) {
      setSortMode(savedSort as SortMode);
    } else {
      setSortMode("manual");
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
          .order("position", { ascending: true }),
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
              setTodos((prev) => {
                if (prev.some((t) => t.id === newTodo.id)) return prev;
                const idx = prev.findIndex((t) => t.position > newTodo.position);
                if (idx === -1) return [...prev, newTodo];
                return [...prev.slice(0, idx), newTodo, ...prev.slice(idx)];
              });
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as Todo;
              setTodos((prev) => {
                const next = prev.map((t) =>
                  t.id === updated.id ? { ...t, ...updated } : t
                );
                return next.sort((a, b) => a.position - b.position);
              });
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
    const minPosition = todos.length > 0
      ? Math.min(...todos.map((t) => t.position))
      : 1000;
    const newPosition = minPosition - 1000;
    const { data, error } = await supabase
      .from("todos")
      .insert({ list_id: selectedListId, text: inputValue.trim(), position: newPosition })
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

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    if (selectedListId) {
      localStorage.setItem(`sortMode:${selectedListId}`, mode);
    }
  };

  const reorderTodo = async (activeId: string, overId: string) => {
    if (activeId === overId) return;

    const oldIndex = todos.findIndex((t) => t.id === activeId);
    const newIndex = todos.findIndex((t) => t.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    // Calculate new position based on neighbors
    const reordered = [...todos];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    let newPosition: number;
    if (newIndex === 0) {
      newPosition = reordered[1] ? reordered[1].position - 1000 : 0;
    } else if (newIndex === reordered.length - 1) {
      newPosition = reordered[newIndex - 1].position + 1000;
    } else {
      const before = reordered[newIndex - 1].position;
      const after = reordered[newIndex + 1].position;
      newPosition = Math.floor((before + after) / 2);
      // If gap is too small, rebalance all positions
      if (newPosition === before || newPosition === after) {
        const rebalanced = reordered.map((t, i) => ({
          ...t,
          position: (i + 1) * 1000,
        }));
        setTodos(rebalanced);
        const supabase = createClient();
        await Promise.all(
          rebalanced.map((t) =>
            supabase.from("todos").update({ position: t.position }).eq("id", t.id)
          )
        );
        return;
      }
    }

    // Optimistic update
    const updated = reordered.map((t) =>
      t.id === activeId ? { ...t, position: newPosition } : t
    );
    setTodos(updated);

    const supabase = createClient();
    await supabase.from("todos").update({ position: newPosition }).eq("id", activeId);
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

  const sortedTodos = useMemo(() => {
    if (sortMode === "manual") return filteredTodos;
    const sorted = [...filteredTodos];
    switch (sortMode) {
      case "created":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "name":
        sorted.sort((a, b) => a.text.localeCompare(b.text, "ja"));
        break;
      case "completed":
        sorted.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.position - b.position;
        });
        break;
    }
    return sorted;
  }, [filteredTodos, sortMode]);

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
      <div className="mb-2 text-sm font-medium text-[var(--fg-secondary)] flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
        フィルター & タグ管理
      </div>
      <TagFilter
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggle={toggleFilterTag}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
      />

      {/* Sort Selector */}
      <SortSelector sortMode={sortMode} onChange={handleSortModeChange} />

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
        {tags.length > 0 && (
          <div className="mt-3 mb-0.5 text-sm font-medium text-[var(--fg-secondary)] flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            追加するタグ
          </div>
        )}
        <TagSelector
          tags={tags}
          selectedTagIds={pendingTagIds}
          onToggle={togglePendingTag}
        />
      </form>

      {/* Todo List */}
      <TodoList
        todos={sortedTodos}
        isLoading={isLoading}
        sortMode={sortMode}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onReorder={reorderTodo}
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
