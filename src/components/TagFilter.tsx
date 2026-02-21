"use client";

import { useState } from "react";
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<TagColorKey>("blue");

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
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTagId || !editName.trim()) return;
    await onUpdateTag(editingTagId, editName.trim(), editColor);
    setEditingTagId(null);
  };

  const handleDelete = async (tagId: string) => {
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
          ) : isEditMode ? (
            <div key={tag.id} className="flex items-stretch">
              <button
                onClick={() => handleStartEdit(tag)}
                className="px-3 py-1 text-xs font-medium rounded-l-full border-y border-l transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: "transparent",
                  color: TAG_COLORS[tag.color as TagColorKey],
                  borderColor: TAG_COLORS[tag.color as TagColorKey],
                }}
                title="Edit tag"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                {tag.name}
              </button>
              <button
                onClick={() => handleDelete(tag.id)}
                className="px-2 py-1 text-xs border-y border-r rounded-r-full hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center"
                style={{
                  borderColor: TAG_COLORS[tag.color as TagColorKey],
                  color: TAG_COLORS[tag.color as TagColorKey],
                }}
                title="Delete tag"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ) : (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
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
          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-2 py-1 text-xs text-[var(--fg-secondary)] hover:text-[var(--fg)] border border-dashed border-[var(--border)] rounded-full transition-colors"
              aria-label="Add tag"
            >
              + Tag
            </button>
            {tags.length > 0 && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1 ${
                  isEditMode
                    ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]"
                    : "text-[var(--fg-secondary)] border-[var(--border)] hover:text-[var(--fg)]"
                }`}
              >
                {isEditMode ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Done
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    Edit
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
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
