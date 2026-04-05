"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Todo, List } from "@/types";

interface Props {
  onClose: () => void;
}

interface DeletedList extends List {
  todos: Todo[];
}

export default function TrashView({ onClose }: Props) {
  const [deletedTodos, setDeletedTodos] = useState<Todo[]>([]);
  const [deletedLists, setDeletedLists] = useState<DeletedList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrash = async () => {
    const supabase = createClient();

    // 削除済みリスト（自分がオーナー）とその中のtodosを取得
    const [todosResult, listsResult] = await Promise.all([
      supabase
        .from("todos")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      supabase
        .from("lists")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
    ]);

    const allDeletedTodos = todosResult.data ?? [];
    const allDeletedLists = listsResult.data ?? [];

    // リストごとのtodosをグルーピング
    const deletedListIds = new Set(allDeletedLists.map((l) => l.id));
    const listsWithTodos: DeletedList[] = allDeletedLists.map((list) => ({
      ...list,
      todos: allDeletedTodos.filter((t) => t.list_id === list.id),
    }));

    // リストが削除されていない単独削除のtodos
    const orphanTodos = allDeletedTodos.filter(
      (t) => !deletedListIds.has(t.list_id)
    );

    setDeletedLists(listsWithTodos);
    setDeletedTodos(orphanTodos);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const restoreTodo = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .update({ deleted_at: null })
      .eq("id", id);

    if (!error) {
      setDeletedTodos((prev) => prev.filter((t) => t.id !== id));
      setDeletedLists((prev) =>
        prev.map((l) => ({
          ...l,
          todos: l.todos.filter((t) => t.id !== id),
        }))
      );
    }
  };

  const permanentDeleteTodo = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (!error) {
      setDeletedTodos((prev) => prev.filter((t) => t.id !== id));
      setDeletedLists((prev) =>
        prev.map((l) => ({
          ...l,
          todos: l.todos.filter((t) => t.id !== id),
        }))
      );
    }
  };

  const restoreList = async (list: DeletedList) => {
    const supabase = createClient();
    // リスト復元 → トリガーがtodosも復元する
    const { error } = await supabase
      .from("lists")
      .update({ deleted_at: null })
      .eq("id", list.id);

    if (!error) {
      setDeletedLists((prev) => prev.filter((l) => l.id !== list.id));
    }
  };

  const permanentDeleteList = async (id: string) => {
    if (!window.confirm("このリストを完全に削除しますか？元に戻せません。"))
      return;

    const supabase = createClient();
    const { error } = await supabase.from("lists").delete().eq("id", id);

    if (!error) {
      setDeletedLists((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const emptyTrash = async () => {
    if (!window.confirm("ゴミ箱を空にしますか？すべてのアイテムが完全に削除されます。"))
      return;

    const supabase = createClient();

    // 単独削除のtodosを物理削除
    const todoIds = deletedTodos.map((t) => t.id);
    if (todoIds.length > 0) {
      await supabase.from("todos").delete().in("id", todoIds);
    }

    // 削除済みリストを物理削除（cascade でtodosも消える）
    const listIds = deletedLists.map((l) => l.id);
    if (listIds.length > 0) {
      await supabase.from("lists").delete().in("id", listIds);
    }

    setDeletedTodos([]);
    setDeletedLists([]);
  };

  const daysAgo = (deletedAt: string) => {
    const diff = Date.now() - new Date(deletedAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const totalCount =
    deletedTodos.length +
    deletedLists.reduce((sum, l) => sum + l.todos.length, 0) +
    deletedLists.length;

  if (isLoading) {
    return (
      <div className="text-[var(--fg-secondary)]">Loading trash...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          Trash
        </h2>
        <button
          onClick={onClose}
          className="text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)] transition-colors"
        >
          Back to lists
        </button>
      </div>

      {totalCount === 0 ? (
        <p className="text-[var(--fg-secondary)] text-sm">
          Trash is empty
        </p>
      ) : (
        <>
          <p className="text-xs text-[var(--fg-secondary)] mb-4">
            Items are permanently deleted after 30 days
          </p>

          {/* 削除済みリスト */}
          {deletedLists.map((list) => (
            <div key={list.id} className="mb-4">
              <div className="theme-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold">{list.name}</span>
                    <span className="text-xs text-[var(--fg-secondary)] ml-2">
                      (list) - {daysAgo(list.deleted_at!)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreList(list)}
                      className="theme-btn px-2 py-1 text-xs"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => permanentDeleteList(list.id)}
                      className="theme-delete px-2 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {list.todos.length > 0 && (
                  <div className="ml-4 text-sm text-[var(--fg-secondary)]">
                    {list.todos.length} todo{list.todos.length !== 1 && "s"} included
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 単独削除のTodos */}
          {deletedTodos.map((todo) => (
            <div key={todo.id} className="mb-2">
              <div className="theme-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className={todo.completed ? "line-through text-[var(--fg-secondary)]" : ""}>
                      {todo.text}
                    </span>
                    <span className="text-xs text-[var(--fg-secondary)] ml-2">
                      {daysAgo(todo.deleted_at!)}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => restoreTodo(todo.id)}
                      className="theme-btn px-2 py-1 text-xs"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => permanentDeleteTodo(todo.id)}
                      className="theme-delete px-2 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* ゴミ箱を空にする */}
          <div className="mt-6">
            <button
              onClick={emptyTrash}
              className="theme-delete px-4 py-2 text-sm"
            >
              Empty trash
            </button>
          </div>
        </>
      )}
    </div>
  );
}
