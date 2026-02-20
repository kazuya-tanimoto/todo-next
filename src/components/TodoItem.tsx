import { Todo } from "@/types";
import { TAG_COLORS, TagColorKey } from "@/lib/tagColors";

interface Props {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: Props) {
  return (
    <div
      className={`theme-card group flex items-center gap-4 p-4 ${
        todo.completed ? "todo-completed" : ""
      }`}
    >
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
