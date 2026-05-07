import { fireEvent, render, screen } from "@testing-library/react";
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
  due_date: null,
  deleted_at: null,
};

const defaultProps = {
  todo: baseTodo,
  isDraggable: false,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onUpdateText: vi.fn(),
  onUpdateDescription: vi.fn(),
  onUpdateDueDate: vi.fn(),
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

describe("TodoItem due date", () => {
  it("calls onUpdateDueDate with ISO string when a date is set", async () => {
    const user = userEvent.setup();
    const onUpdateDueDate = vi.fn();
    render(<TodoItem {...defaultProps} onUpdateDueDate={onUpdateDueDate} />);

    await user.click(screen.getByText("Buy milk"));

    const input = screen.getByLabelText("due date") as HTMLInputElement;
    expect(input).toHaveValue("");

    // datetime-local format is YYYY-MM-DDTHH:mm; userEvent.type does not handle this
    // input type reliably across happy-dom versions, so use fireEvent.change to
    // simulate a controlled-input change directly.
    fireEvent.change(input, { target: { value: "2026-06-01T09:00" } });
    fireEvent.blur(input);

    expect(onUpdateDueDate).toHaveBeenCalledTimes(1);
    const [id, iso] = onUpdateDueDate.mock.calls[0];
    expect(id).toBe("todo-1");
    expect(typeof iso).toBe("string");
    expect(new Date(iso).toISOString()).toBe(new Date("2026-06-01T09:00").toISOString());
  });

  it("calls onUpdateDueDate with null when cleared", async () => {
    const user = userEvent.setup();
    const onUpdateDueDate = vi.fn();
    const todoWithDue: Todo = { ...baseTodo, due_date: "2026-06-01T09:00:00.000Z" };
    render(<TodoItem {...defaultProps} todo={todoWithDue} onUpdateDueDate={onUpdateDueDate} />);

    await user.click(screen.getByText("Buy milk"));
    await user.click(screen.getByRole("button", { name: "Clear due date" }));

    expect(onUpdateDueDate).toHaveBeenCalledWith("todo-1", null);
  });

  it("renders an overdue badge when due_date is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));
    const todoOverdue: Todo = { ...baseTodo, due_date: "2026-06-01T09:00:00.000Z" };
    render(<TodoItem {...defaultProps} todo={todoOverdue} />);
    expect(screen.getByLabelText("due overdue")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders a soon badge when due_date is within 3 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const todoSoon: Todo = { ...baseTodo, due_date: "2026-06-03T12:00:00.000Z" };
    render(<TodoItem {...defaultProps} todo={todoSoon} />);
    expect(screen.getByLabelText("due soon")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders a future badge when due_date is more than 3 days ahead", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const todoFuture: Todo = { ...baseTodo, due_date: "2026-06-30T12:00:00.000Z" };
    render(<TodoItem {...defaultProps} todo={todoFuture} />);
    expect(screen.getByLabelText("due future")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does not render a due badge when due_date is null", () => {
    render(<TodoItem {...defaultProps} />);
    expect(screen.queryByLabelText(/^due /)).not.toBeInTheDocument();
  });
});
