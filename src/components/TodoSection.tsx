"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Todo } from "@/types";
import TodoList from "./TodoList";

interface Props {
  selectedListId: string | null;
}

export default function TodoSection({ selectedListId }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedListId) {
      setTodos([]);
      return;
    }

    let ignore = false;
    const supabase = createClient();

    const fetchTodos = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("list_id", selectedListId)
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (!error && data) {
        setTodos(data);
      }
      setIsLoading(false);
    };

    fetchTodos();

    const channel = supabase
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
            const newTodo = payload.new as Todo;
            setTodos((prev) =>
              prev.some((t) => t.id === newTodo.id) ? prev : [newTodo, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Todo;
            setTodos((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setTodos((prev) => prev.filter((t) => t.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
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
      setTodos((prev) => [data, ...prev]);
      setInputValue("");
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
      </form>

      {/* Todo List */}
      <TodoList
        todos={todos}
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
