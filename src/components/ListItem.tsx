import { useRef, useEffect } from "react";
import { List } from "@/types";

interface Props {
  list: List;
  isSelected: boolean;
  isOwner: boolean;
  ownerName?: string | null;
  isEditing: boolean;
  editingName: string;
  onSelect: (id: string) => void;
  onStartEditing: (list: List) => void;
  onEditingNameChange: (name: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
}

export default function ListItem({
  list,
  isSelected,
  isOwner,
  ownerName,
  isEditing,
  editingName,
  onSelect,
  onStartEditing,
  onEditingNameChange,
  onRename,
  onDelete,
  onShare,
}: Props) {
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="group flex items-center">
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRename(list.id);
          }}
        >
          <input
            ref={editInputRef}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={() => onRename(list.id)}
            className="theme-input px-2 py-1 text-sm w-32"
          />
        </form>
      ) : (
        <>
          <button
            onClick={() => onSelect(list.id)}
            className={`theme-btn px-3 py-1.5 text-sm ${
              !isSelected ? "bg-[var(--card-bg)] text-[var(--fg)]" : ""
            }`}
            title={
              !isOwner && ownerName
                ? `Shared by ${ownerName}`
                : undefined
            }
          >
            {!isOwner && (
              <span className="text-[var(--fg-secondary)] mr-1">
                &#x1F91D;
              </span>
            )}
            {list.name}
            {!isOwner && ownerName && (
              <span className="text-[var(--fg-secondary)] text-xs ml-1">
                ({ownerName})
              </span>
            )}
          </button>
          <span className="ml-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button
              onClick={() => onShare(list.id)}
              className="text-xs px-1 text-[var(--fg-secondary)] hover:text-[var(--fg)]"
              aria-label={`Share ${list.name}`}
            >
              &#x1F517;
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => onStartEditing(list)}
                  className="text-xs px-1 text-[var(--fg-secondary)] hover:text-[var(--fg)]"
                  aria-label={`Rename ${list.name}`}
                >
                  ✎
                </button>
                <button
                  onClick={() => onDelete(list.id)}
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
  );
}
