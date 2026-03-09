import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Todo } from "@/types";
import { TAG_COLORS, TagColorKey } from "@/lib/tagColors";

interface Props {
  todo: Todo;
  isDraggable: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, isDraggable, onToggle, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`theme-card group flex items-center gap-4 p-4 ${
        todo.completed ? "todo-completed" : ""
      }`}
    >
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
      <button
        onClick={() => onDelete(todo.id)}
        className="theme-delete px-3 py-1 font-bold"
        aria-label="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
