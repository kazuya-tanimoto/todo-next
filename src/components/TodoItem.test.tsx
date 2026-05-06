import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Todo } from "@/types";
import TodoItem from "./TodoItem";

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
  deleted_at: null,
};

const defaultProps = {
  todo: baseTodo,
  isDraggable: false,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onUpdateText: vi.fn(),
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
    render(<TodoItem {...defaultProps} onUpdateDescription={onUpdateDescription} />);

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
      <TodoItem {...defaultProps} todo={todoWithDesc} onUpdateDescription={onUpdateDescription} />,
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

describe("TodoItem inline edit", () => {
  it("enters edit mode on double-click and saves on Enter", async () => {
    const user = userEvent.setup();
    const onUpdateText = vi.fn();
    render(<TodoItem {...defaultProps} onUpdateText={onUpdateText} />);

    expect(screen.queryByRole("textbox", { name: /edit todo/i })).not.toBeInTheDocument();

    await user.dblClick(screen.getByText("Buy milk"));

    const input = screen.getByRole("textbox", { name: /edit todo/i });
    expect(input).toHaveValue("Buy milk");

    await user.clear(input);
    await user.type(input, "Buy eggs{Enter}");

    expect(onUpdateText).toHaveBeenCalledWith("todo-1", "Buy eggs");
    expect(screen.queryByRole("textbox", { name: /edit todo/i })).not.toBeInTheDocument();
  });

  it("cancels edit on Escape without saving", async () => {
    const user = userEvent.setup();
    const onUpdateText = vi.fn();
    render(<TodoItem {...defaultProps} onUpdateText={onUpdateText} />);

    await user.dblClick(screen.getByText("Buy milk"));

    const input = screen.getByRole("textbox", { name: /edit todo/i });
    await user.clear(input);
    await user.type(input, "Buy eggs{Escape}");

    expect(onUpdateText).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: /edit todo/i })).not.toBeInTheDocument();
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });

  it("saves on blur when text has changed", async () => {
    const user = userEvent.setup();
    const onUpdateText = vi.fn();
    render(<TodoItem {...defaultProps} onUpdateText={onUpdateText} />);

    await user.dblClick(screen.getByText("Buy milk"));

    const input = screen.getByRole("textbox", { name: /edit todo/i });
    await user.clear(input);
    await user.type(input, "Buy bread");
    await user.tab();

    expect(onUpdateText).toHaveBeenCalledWith("todo-1", "Buy bread");
  });

  it("does not save on blur when text is unchanged", async () => {
    const user = userEvent.setup();
    const onUpdateText = vi.fn();
    render(<TodoItem {...defaultProps} onUpdateText={onUpdateText} />);

    await user.dblClick(screen.getByText("Buy milk"));

    await user.tab();

    expect(onUpdateText).not.toHaveBeenCalled();
  });
});
