import { Todo } from "@/types";

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
      <span
        className={`flex-1 text-lg ${
          todo.completed ? "line-through text-[var(--fg-secondary)]" : ""
        }`}
      >
        {todo.text}
      </span>
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
