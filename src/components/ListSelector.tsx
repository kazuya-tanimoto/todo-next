"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { List } from "@/types";
import ShareDialog from "@/components/ShareDialog";

interface Props {
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
}

export default function ListSelector({ selectedListId, onSelectList }: Props) {
  const [lists, setLists] = useState<List[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [shareDialogListId, setShareDialogListId] = useState<string | null>(
    null
  );
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const fetchLists = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("lists")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setLists(data);
      if (!selectedListId && data.length > 0) {
        onSelectList(data[0].id);
      }
    }
    setIsLoading(false);
  };

  const isOwner = (list: List) => list.user_id === currentUserId;

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("lists")
      .insert({ name: newListName.trim(), user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setLists([...lists, data]);
      setNewListName("");
      onSelectList(data.id);
    }
  };

  const renameList = async (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("lists")
      .update({ name: editingName.trim() })
      .eq("id", id);

    if (!error) {
      setLists(
        lists.map((l) =>
          l.id === id ? { ...l, name: editingName.trim() } : l
        )
      );
    }
    setEditingId(null);
  };

  const deleteList = async (id: string) => {
    if (!window.confirm("このリストを削除しますか？")) return;

    const supabase = createClient();
    const { error } = await supabase.from("lists").delete().eq("id", id);

    if (!error) {
      const remaining = lists.filter((l) => l.id !== id);
      setLists(remaining);
      if (selectedListId === id) {
        onSelectList(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleLeaveList = () => {
    if (!shareDialogListId) return;
    const remaining = lists.filter((l) => l.id !== shareDialogListId);
    setLists(remaining);
    if (selectedListId === shareDialogListId) {
      onSelectList(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const startEditing = (list: List) => {
    setEditingId(list.id);
    setEditingName(list.name);
  };

  const shareDialogList = lists.find((l) => l.id === shareDialogListId);

  if (isLoading) {
    return (
      <div className="mb-6 text-[var(--fg-secondary)]">Loading lists...</div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-[var(--fg-secondary)] mb-2">
        Lists
      </p>

      {/* List items */}
      <div className="flex flex-wrap gap-2 mb-3">
        {lists.map((list) => (
          <div key={list.id} className="group flex items-center">
            {editingId === list.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  renameList(list.id);
                }}
              >
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => renameList(list.id)}
                  className="theme-input px-2 py-1 text-sm w-32"
                />
              </form>
            ) : (
              <>
                <button
                  onClick={() => onSelectList(list.id)}
                  className={`theme-btn px-3 py-1.5 text-sm ${
                    selectedListId !== list.id
                      ? "bg-[var(--card-bg)] text-[var(--fg)]"
                      : ""
                  }`}
                >
                  {!isOwner(list) && (
                    <span className="text-[var(--fg-secondary)] mr-1" title="Shared">
                      *
                    </span>
                  )}
                  {list.name}
                </button>
                <span className="ml-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button
                    onClick={() => setShareDialogListId(list.id)}
                    className="text-xs px-1 text-[var(--fg-secondary)] hover:text-[var(--fg)]"
                    aria-label={`Share ${list.name}`}
                  >
                    &#x1F517;
                  </button>
                  {isOwner(list) && (
                    <>
                      <button
                        onClick={() => startEditing(list)}
                        className="text-xs px-1 text-[var(--fg-secondary)] hover:text-[var(--fg)]"
                        aria-label={`Rename ${list.name}`}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => deleteList(list.id)}
                        className="text-xs px-1 text-[var(--fg-secondary)] hover:text-red-500"
                        aria-label={`Delete ${list.name}`}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* New list input */}
      <form onSubmit={createList} className="flex gap-2">
        <input
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="New list name..."
          className="theme-input px-3 py-1.5 text-sm flex-1"
        />
        <button
          type="submit"
          className="theme-btn px-3 py-1.5 text-sm"
          disabled={!newListName.trim()}
        >
          Add
        </button>
      </form>

      {/* Share dialog */}
      {shareDialogListId && shareDialogList && (
        <ShareDialog
          listId={shareDialogListId}
          listName={shareDialogList.name}
          isOwner={isOwner(shareDialogList)}
          onClose={() => setShareDialogListId(null)}
          onLeave={handleLeaveList}
        />
      )}
    </div>
  );
}
