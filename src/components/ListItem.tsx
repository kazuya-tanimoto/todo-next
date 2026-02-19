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

  if (isEditing) {
    return (
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
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(list.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(list.id);
        }
      }}
      className={`theme-btn px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${
        !isSelected ? "bg-[var(--card-bg)] text-[var(--fg)]" : ""
      }`}
    >
      {!isOwner && (
        <span className="text-[var(--fg-secondary)]" aria-label="Shared">
          &#x1F91D;
        </span>
      )}
      <span>{list.name}</span>
      <span className="inline-flex items-center gap-0.5 ml-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(list.id);
          }}
          className="text-xs px-0.5 text-[var(--fg-secondary)] hover:text-[var(--fg)]"
          aria-label={`Share ${list.name}`}
          title={
            !isOwner && ownerName
              ? `Shared by ${ownerName}`
              : undefined
          }
        >
          &#x1F517;
        </button>
        {isOwner && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEditing(list);
              }}
              className="text-xs px-0.5 text-[var(--fg-secondary)] hover:text-[var(--fg)] inline-block"
              style={{ transform: "scaleX(-1)" }}
              aria-label={`Rename ${list.name}`}
            >
              &#x270F;&#xFE0F;
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(list.id);
              }}
              className="text-xs px-0.5 text-[var(--fg-secondary)] hover:text-red-500"
              aria-label={`Delete ${list.name}`}
            >
              &#x1F5D1;&#xFE0F;
            </button>
          </>
        )}
      </span>
    </div>
  );
}
