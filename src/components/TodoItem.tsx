"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { TAG_COLORS, type TagColorKey } from "@/lib/tagColors";
import type { Todo } from "@/types";

interface Props {
  todo: Todo;
  isDraggable: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onUpdateDueDate?: (id: string, dueDate: string | null) => void;
}

const SOON_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

type DueDateStatus = "overdue" | "soon" | "future";

function getDueDateStatus(due: string | null, now: number = Date.now()): DueDateStatus | null {
  if (!due) return null;
  const dueMs = new Date(due).getTime();
  if (Number.isNaN(dueMs)) return null;
  const diff = dueMs - now;
  if (diff < 0) return "overdue";
  if (diff <= SOON_THRESHOLD_MS) return "soon";
  return "future";
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDueDateBadge(iso: string, now: Date = new Date()): string {
  const due = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(due.getHours())}:${pad(due.getMinutes())}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDiff = Math.round((dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (dayDiff === 0) return `今日 ${time}`;
  if (dayDiff === 1) return `明日 ${time}`;
  if (dayDiff === -1) return `昨日 ${time}`;
  return `${due.getMonth() + 1}/${due.getDate()} ${time}`;
}

export default function TodoItem({
  todo,
  isDraggable,
  onToggle,
  onDelete,
  onUpdateText,
  onUpdateDescription,
  onUpdateDueDate,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !isDraggable,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [textDraft, setTextDraft] = useState(todo.text);
  const [descriptionDraft, setDescriptionDraft] = useState(todo.description ?? "");
  const [dueDateDraft, setDueDateDraft] = useState(toLocalInput(todo.due_date));

  useEffect(() => {
    if (isDragging) setIsExpanded(false);
  }, [isDragging]);

  useEffect(() => {
    if (!isEditing) {
      setTextDraft(todo.text);
    }
  }, [todo.text, isEditing]);

  useEffect(() => {
    if (!isExpanded) {
      setDescriptionDraft(todo.description ?? "");
      setDueDateDraft(toLocalInput(todo.due_date));
    }
  }, [todo.description, todo.due_date, isExpanded]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const commitTextEdit = () => {
    const trimmed = textDraft.trim();
    if (trimmed && trimmed !== todo.text) {
      onUpdateText(todo.id, trimmed);
    }
    setIsEditing(false);
  };

  const cancelTextEdit = () => {
    setTextDraft(todo.text);
    setIsEditing(false);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTextEdit();
    } else if (e.key === "Escape") {
      cancelTextEdit();
    }
  };

  const handleBlur = () => {
    if (descriptionDraft !== (todo.description ?? "")) {
      onUpdateDescription(todo.id, descriptionDraft);
    }
  };

  const commitDueDate = (next: string) => {
    if (!onUpdateDueDate) return;
    const nextIso = fromLocalInput(next);
    if (nextIso === todo.due_date) return;
    onUpdateDueDate(todo.id, nextIso);
  };

  const clearDueDate = () => {
    setDueDateDraft("");
    if (onUpdateDueDate && todo.due_date !== null) {
      onUpdateDueDate(todo.id, null);
    }
  };

  const dueStatus = getDueDateStatus(todo.due_date);
  const dueBadgeColor =
    dueStatus === "overdue"
      ? "var(--accent)"
      : dueStatus === "soon"
        ? "var(--fg-primary)"
        : "var(--fg-secondary)";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`theme-card group ${todo.completed ? "todo-completed" : ""}`}
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
          onClick={() => !isEditing && setIsExpanded((prev) => !prev)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                aria-label="Edit todo"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onBlur={commitTextEdit}
                onKeyDown={handleTextKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="theme-input w-full text-lg px-1 py-0"
              />
            ) : (
              <span
                className={`text-lg ${
                  todo.completed ? "line-through text-[var(--fg-secondary)]" : ""
                }`}
              >
                {todo.text}
              </span>
            )}
            {(todo.due_date || (todo.tags && todo.tags.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {todo.due_date && dueStatus && (
                  <span
                    role="status"
                    aria-label={`due ${dueStatus}`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border"
                    style={{
                      color: dueBadgeColor,
                      borderColor: dueBadgeColor,
                      opacity: todo.completed ? 0.5 : 1,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatDueDateBadge(todo.due_date)}
                  </span>
                )}
                {todo.tags?.map((tag) => (
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
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
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
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`due-${todo.id}`}
              className="text-sm font-medium text-[var(--fg-secondary)] shrink-0"
            >
              期限
            </label>
            <input
              id={`due-${todo.id}`}
              type="datetime-local"
              aria-label="due date"
              value={dueDateDraft}
              onChange={(e) => setDueDateDraft(e.target.value)}
              onBlur={() => commitDueDate(dueDateDraft)}
              className="theme-input px-2 py-1 text-sm"
            />
            {dueDateDraft && (
              <button
                type="button"
                onClick={clearDueDate}
                aria-label="Clear due date"
                className="theme-delete px-2 py-1 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>
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
