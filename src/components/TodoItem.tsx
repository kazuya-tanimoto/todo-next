"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Todo } from "@/types";
import { TAG_COLORS, TagColorKey } from "@/lib/tagColors";

interface Props {
  todo: Todo;
  isDraggable: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
}

export default function TodoItem({
  todo,
  isDraggable,
  onToggle,
  onDelete,
  onUpdateDescription,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: !isDraggable });

  const [isExpanded, setIsExpanded] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(
    todo.description ?? ""
  );

  useEffect(() => {
    if (isDragging) setIsExpanded(false);
  }, [isDragging]);

  useEffect(() => {
    if (!isExpanded) {
      setDescriptionDraft(todo.description ?? "");
    }
  }, [todo.description, isExpanded]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const handleBlur = () => {
    if (descriptionDraft !== (todo.description ?? "")) {
      onUpdateDescription(todo.id, descriptionDraft);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`theme-card ${todo.completed ? "todo-completed" : ""}`}
    >
      <div className="flex items-center gap-4 p-4">
        {isDraggable && (
          <button
            type="button"
            className="drag-handle touch-none cursor-grab active:cursor-grabbing text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>
        )}
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id, todo.completed)}
          className="theme-checkbox"
        />
        <button
          type="button"
          aria-expanded={isExpanded}
          className="flex-1 min-w-0 text-left flex items-start justify-between gap-2"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <div className="flex-1 min-w-0">
            <span
              className={`text-lg ${
                todo.completed ? "line-through text-[var(--fg-secondary)]" : ""
              }`}
            >
              {todo.text}
            </span>
            {todo.tags && todo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {todo.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-block px-1.5 py-0.5 text-[10px] font-medium text-white rounded-full"
                    style={{
                      backgroundColor: TAG_COLORS[tag.color as TagColorKey],
                      opacity: todo.completed ? 0.5 : 1,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 text-[var(--fg-secondary)]">
            {todo.description && !isExpanded && (
              <svg
                role="img"
                aria-label="has description"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="3" y="4" width="18" height="2" rx="1" />
                <rect x="3" y="9" width="14" height="2" rx="1" />
                <rect x="3" y="14" width="16" height="2" rx="1" />
                <rect x="3" y="19" width="10" height="2" rx="1" />
              </svg>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="theme-delete px-3 py-1 font-bold"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4">
          <textarea
            aria-label="description"
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            placeholder="Add a description..."
            className="theme-input w-full px-3 py-2 text-sm resize-y"
          />
        </div>
      )}
    </div>
  );
}
