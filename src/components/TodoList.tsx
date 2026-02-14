import { Todo } from "@/types";
import TodoItem from "./TodoItem";

interface Props {
  todos: Todo[];
  isLoading: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export default function TodoList({
  todos,
  isLoading,
  onToggle,
  onDelete,
}: Props) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-[var(--fg-secondary)]">
        Loading...
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="theme-card p-8 text-center">
        <div className="mb-2 text-4xl">📝</div>
        <p className="text-[var(--fg-secondary)]">
          Empty list. Time to add tasks!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
