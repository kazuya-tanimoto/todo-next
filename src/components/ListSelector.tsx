"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import { List } from "@/types";
import ShareDialog from "@/components/ShareDialog";
import ListItem from "./ListItem";

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

  const selectedListIdRef = useRef(selectedListId);
  selectedListIdRef.current = selectedListId;
  const onSelectListRef = useRef(onSelectList);
  onSelectListRef.current = onSelectList;

  const fetchLists = useCallback(async () => {
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
      if (!selectedListIdRef.current && data.length > 0) {
        onSelectListRef.current(data[0].id);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLists();

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initRealtime = async () => {
      await ensureRealtimeAuth(supabase);

      channel = supabase
        .channel("lists")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lists" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newList = payload.new as List;
              setLists((prev) =>
                prev.some((l) => l.id === newList.id)
                  ? prev
                  : [...prev, newList]
              );
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as List;
              setLists((prev) =>
                prev.map((l) => (l.id === updated.id ? updated : l))
              );
            } else if (payload.eventType === "DELETE") {
              const deleted = payload.old as { id: string };
              setLists((prev) => {
                const remaining = prev.filter((l) => l.id !== deleted.id);
                if (selectedListIdRef.current === deleted.id) {
                  onSelectListRef.current(
                    remaining.length > 0 ? remaining[0].id : null
                  );
                }
                return remaining;
              });
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "list_shares" },
          () => {
            fetchLists();
          }
        )
        .subscribe();
    };

    initRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchLists]);

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
          <ListItem
            key={list.id}
            list={list}
            isSelected={selectedListId === list.id}
            isOwner={isOwner(list)}
            isEditing={editingId === list.id}
            editingName={editingName}
            onSelect={onSelectList}
            onStartEditing={startEditing}
            onEditingNameChange={setEditingName}
            onRename={renameList}
            onDelete={deleteList}
            onShare={setShareDialogListId}
          />
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
