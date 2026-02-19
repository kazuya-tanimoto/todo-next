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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
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
      <span className="inline-flex items-center gap-1 ml-1">
        <span className="w-0.5 h-4 bg-current opacity-50 mx-1" aria-hidden="true" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(list.id);
          }}
          className="hover:scale-110 transition-transform"
          aria-label={`Share ${list.name}`}
          title={
            !isOwner && ownerName
              ? `Shared by ${ownerName}`
              : undefined
          }
        >
          <ShareIcon />
        </button>
        {isOwner && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEditing(list);
              }}
              className="hover:scale-110 transition-transform"
              aria-label={`Rename ${list.name}`}
            >
              <EditIcon />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(list.id);
              }}
              className="hover:scale-110 transition-transform"
              aria-label={`Delete ${list.name}`}
            >
              <TrashIcon />
            </button>
          </>
        )}
      </span>
    </div>
  );
}
