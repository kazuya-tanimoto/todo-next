import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Todo, SortMode } from "@/types";
import TodoItem from "./TodoItem";

interface Props {
  todos: Todo[];
  isLoading: boolean;
  sortMode: SortMode;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
}

export default function TodoList({
  todos,
  isLoading,
  sortMode,
  onToggle,
  onDelete,
  onReorder,
  onUpdateText,
  onUpdateDescription,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

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

  const isDraggable = sortMode === "manual";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  const items = todos.map((todo) => (
    <TodoItem
      key={todo.id}
      todo={todo}
      isDraggable={isDraggable}
      onToggle={onToggle}
      onDelete={onDelete}
      onUpdateText={onUpdateText}
      onUpdateDescription={onUpdateDescription}
    />
  ));

  if (!isDraggable) {
    return <div className="space-y-3">{items}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={todos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">{items}</div>
      </SortableContext>
    </DndContext>
  );
}
