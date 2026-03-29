import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import TodoItem from "./TodoItem";
import { Todo } from "@/types";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

const baseTodo: Todo = {
  id: "todo-1",
  list_id: "list-1",
  text: "Buy milk",
  completed: false,
  created_at: "2026-01-01T00:00:00Z",
  position: 1000,
  description: null,
};

const defaultProps = {
  todo: baseTodo,
  isDraggable: false,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onUpdateDescription: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TodoItem accordion", () => {
  it("shows textarea when text area is clicked and hides it on second click", async () => {
    const user = userEvent.setup();
    render(<TodoItem {...defaultProps} />);

    expect(screen.queryByRole("textbox", { name: /description/i })).not.toBeInTheDocument();

    await user.click(screen.getByText("Buy milk"));

    expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();

    await user.click(screen.getByText("Buy milk"));

    expect(screen.queryByRole("textbox", { name: /description/i })).not.toBeInTheDocument();
  });

  it("calls onUpdateDescription with new value on blur when changed", async () => {
    const user = userEvent.setup();
    const onUpdateDescription = vi.fn();
    render(
      <TodoItem {...defaultProps} onUpdateDescription={onUpdateDescription} />
    );

    await user.click(screen.getByText("Buy milk"));

    const textarea = screen.getByRole("textbox", { name: /description/i });
    await user.type(textarea, "From the store");
    await user.tab();

    expect(onUpdateDescription).toHaveBeenCalledWith("todo-1", "From the store");
  });

  it("does not call onUpdateDescription on blur when description is unchanged", async () => {
    const user = userEvent.setup();
    const onUpdateDescription = vi.fn();
    const todoWithDesc: Todo = { ...baseTodo, description: "Existing note" };
    render(
      <TodoItem
        {...defaultProps}
        todo={todoWithDesc}
        onUpdateDescription={onUpdateDescription}
      />
    );

    await user.click(screen.getByText("Buy milk"));

    const textarea = screen.getByRole("textbox", { name: /description/i });
    expect(textarea).toHaveValue("Existing note");

    await user.tab();

    expect(onUpdateDescription).not.toHaveBeenCalled();
  });

  it("shows description indicator when description exists and accordion is collapsed", async () => {
    const todoWithDesc: Todo = { ...baseTodo, description: "Some notes" };
    render(<TodoItem {...defaultProps} todo={todoWithDesc} />);

    expect(screen.getByRole("img", { name: /has description/i })).toBeInTheDocument();
  });
});
