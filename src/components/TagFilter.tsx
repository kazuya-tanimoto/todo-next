"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Tag } from "@/types";
import { TAG_COLORS, TAG_COLOR_KEYS, TagColorKey } from "@/lib/tagColors";

interface Props {
  tags: Tag[];
  selectedTagIds: Set<string>;
  onToggle: (tagId: string) => void;
  onCreateTag: (name: string, color: TagColorKey) => Promise<void>;
  onUpdateTag: (id: string, name: string, color: TagColorKey) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
}

interface ContextMenuState {
  tagId: string;
  x: number;
  y: number;
}

export default function TagFilter({
  tags,
  selectedTagIds,
  onToggle,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<TagColorKey>("blue");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<TagColorKey>("blue");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        closeContextMenu();
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu, closeContextMenu]);

  const handleContextMenu = (e: React.MouseEvent, tagId: string) => {
    e.preventDefault();
    setContextMenu({ tagId, x: e.clientX, y: e.clientY });
  };

  const handlePointerDown = (tagId: string, e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    longPressTimer.current = setTimeout(() => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setContextMenu({ tagId, x: rect.left, y: rect.bottom });
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName("");
    setNewTagColor("blue");
    setShowCreateForm(false);
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color as TagColorKey);
    closeContextMenu();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTagId || !editName.trim()) return;
    await onUpdateTag(editingTagId, editName.trim(), editColor);
    setEditingTagId(null);
  };

  const handleDelete = async (tagId: string) => {
    closeContextMenu();
    await onDeleteTag(tagId);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) =>
          editingTagId === tag.id ? (
            <form
              key={tag.id}
              onSubmit={handleUpdate}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="theme-input px-2 py-1 text-xs w-24"
                autoFocus
              />
              <ColorPalette
                selected={editColor}
                onSelect={setEditColor}
                size="sm"
              />
              <button type="submit" className="theme-btn px-2 py-1 text-xs">
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingTagId(null)}
                className="text-[var(--fg-secondary)] px-1 text-xs"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              onContextMenu={(e) => handleContextMenu(e, tag.id)}
              onPointerDown={(e) => handlePointerDown(tag.id, e)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="px-3 py-1 text-xs font-medium rounded-full border transition-colors"
              style={
                selectedTagIds.has(tag.id)
                  ? {
                      backgroundColor: TAG_COLORS[tag.color as TagColorKey],
                      color: "#fff",
                      borderColor: TAG_COLORS[tag.color as TagColorKey],
                    }
                  : {
                      backgroundColor: "transparent",
                      color: TAG_COLORS[tag.color as TagColorKey],
                      borderColor: TAG_COLORS[tag.color as TagColorKey],
                    }
              }
              aria-pressed={selectedTagIds.has(tag.id)}
            >
              {tag.name}
            </button>
          )
        )}

        {showCreateForm ? (
          <form
            onSubmit={handleCreate}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="theme-input px-2 py-1 text-xs w-24"
              autoFocus
            />
            <ColorPalette
              selected={newTagColor}
              onSelect={setNewTagColor}
              size="sm"
            />
            <button
              type="submit"
              className="theme-btn px-2 py-1 text-xs"
              disabled={!newTagName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewTagName("");
              }}
              className="text-[var(--fg-secondary)] px-1 text-xs"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-2 py-1 text-xs text-[var(--fg-secondary)] hover:text-[var(--fg)] border border-dashed border-[var(--border)] rounded-full transition-colors"
            aria-label="Add tag"
          >
            + Tag
          </button>
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[var(--card-bg)] border border-[var(--border)] rounded shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              const tag = tags.find((t) => t.id === contextMenu.tagId);
              if (tag) handleStartEdit(tag);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-secondary)]"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(contextMenu.tagId)}
            className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--bg-secondary)]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ColorPalette({
  selected,
  onSelect,
  size = "sm",
}: {
  selected: TagColorKey;
  onSelect: (color: TagColorKey) => void;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex gap-1">
      {TAG_COLOR_KEYS.map((colorKey) => (
        <button
          key={colorKey}
          type="button"
          onClick={() => onSelect(colorKey)}
          className={`${sizeClass} rounded-full border-2 transition-transform ${
            selected === colorKey
              ? "border-[var(--fg)] scale-125"
              : "border-transparent"
          }`}
          style={{ backgroundColor: TAG_COLORS[colorKey] }}
          aria-label={colorKey}
        />
      ))}
    </div>
  );
}
