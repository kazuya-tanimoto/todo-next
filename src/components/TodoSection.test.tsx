import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import TodoSection from "./TodoSection";

const mockTodos = [
  {
    id: "todo-1",
    list_id: "list-1",
    text: "Buy milk",
    completed: false,
    created_at: "2026-01-02T00:00:00Z",
    position: 1000,
    description: null,
  },
  {
    id: "todo-2",
    list_id: "list-1",
    text: "Walk the dog",
    completed: true,
    created_at: "2026-01-01T00:00:00Z",
    position: 2000,
    description: null,
  },
];

const mockTags = [
  {
    id: "tag-1",
    list_id: "list-1",
    name: "Groceries",
    color: "green",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "tag-2",
    list_id: "list-1",
    name: "Urgent",
    color: "red",
    created_at: "2026-01-01T00:00:00Z",
  },
];

// Terminal mocks for todos
const mockTodosOrder = vi.fn();
const mockTodosUpdateResult = vi.fn();
const mockTodosSingle = vi.fn();

// Terminal mocks for tags
const mockTagsOrder = vi.fn();
const mockTagsSingle = vi.fn();
const mockTagsDeleteResult = vi.fn();

// Terminal mock for todo_tags
const mockTodoTagsIn = vi.fn();
const mockTodoTagsInsert = vi.fn();

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  ensureRealtimeAuth: vi.fn().mockResolvedValue(undefined),
  createClient: () => ({
    from: (table: string) => {
      if (table === "todos") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                order: mockTodosOrder,
              }),
              order: mockTodosOrder,
            }),
          }),
          insert: () => ({
            select: () => ({
              single: mockTodosSingle,
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: mockTodosUpdateResult,
              }),
              select: mockTodosUpdateResult,
            }),
          }),
          delete: () => ({
            eq: () => ({
              select: mockTodosUpdateResult,
            }),
          }),
        };
      }
      if (table === "tags") {
        return {
          select: () => ({
            eq: () => ({
              order: mockTagsOrder,
            }),
          }),
          insert: () => ({
            select: () => ({
              single: mockTagsSingle,
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: mockTagsSingle,
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              select: mockTagsDeleteResult,
            }),
          }),
        };
      }
      if (table === "todo_tags") {
        return {
          select: () => ({
            in: mockTodoTagsIn,
            // biome-ignore lint/suspicious/noThenProperty: Supabase query builder is intentionally thenable
            eq: () => ({ then: vi.fn() }),
          }),
          insert: mockTodoTagsInsert,
        };
      }
      return {};
    },
    channel: () => mockChannel,
    removeChannel: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockTodosOrder.mockResolvedValue({ data: mockTodos, error: null });
  mockTodosUpdateResult.mockResolvedValue({
    data: [{ id: "todo-1" }],
    error: null,
  });
  mockTagsOrder.mockResolvedValue({ data: [], error: null });
  mockTagsDeleteResult.mockResolvedValue({
    data: [{ id: "tag-1" }],
    error: null,
  });
  mockTagsSingle.mockResolvedValue({ data: null, error: null });
  window.alert = vi.fn();
  mockTodoTagsIn.mockResolvedValue({ data: [], error: null });
  mockTodoTagsInsert.mockResolvedValue({ error: null });
});

describe("TodoSection", () => {
  it("renders empty state when no list is selected", () => {
    render(<TodoSection selectedListId={null} />);

    expect(screen.getByText("Select a list to get started")).toBeInTheDocument();
  });

  it("renders empty state when list has no todos", async () => {
    mockTodosOrder.mockResolvedValue({ data: [], error: null });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Empty list. Time to add tasks!")).toBeInTheDocument();
    });

    expect(screen.getByText("No tasks yet. Add something!")).toBeInTheDocument();
  });

  it("renders fetched todos", async () => {
    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    expect(screen.getByText("1/2 completed")).toBeInTheDocument();
  });

  it("can add a todo", async () => {
    const user = userEvent.setup();
    const newTodo = {
      id: "todo-3",
      list_id: "list-1",
      text: "Read a book",
      completed: false,
      created_at: "2026-01-03T00:00:00Z",
      position: 0,
      description: null,
    };
    mockTodosSingle.mockResolvedValue({ data: newTodo, error: null });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("What needs to be done?");
    await user.type(input, "Read a book");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Read a book")).toBeInTheDocument();
    });
    expect(input).toHaveValue("");
    expect(screen.getByText("1/3 completed")).toBeInTheDocument();
  });

  it("can toggle a todo", async () => {
    const user = userEvent.setup();
    mockTodosUpdateResult.mockResolvedValue({
      data: [{ id: "todo-1" }],
      error: null,
    });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText("2/2 completed")).toBeInTheDocument();
    });
  });

  it("can delete a todo", async () => {
    const user = userEvent.setup();
    mockTodosUpdateResult.mockResolvedValue({
      data: [{ id: "todo-1" }],
      error: null,
    });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete task",
    });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    expect(screen.getByText("1/1 completed")).toBeInTheDocument();
  });

  it("can clear completed todos", async () => {
    const user = userEvent.setup();
    mockTodosUpdateResult.mockResolvedValue({
      data: [{ id: "todo-2" }],
      error: null,
    });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Clear completed (1)" }));

    await waitFor(() => {
      expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("0/1 completed")).toBeInTheDocument();
  });

  it("alerts and keeps todo when toggle returns 0 rows (silent fail)", async () => {
    const user = userEvent.setup();
    mockTodosUpdateResult.mockResolvedValue({ data: [], error: null });
    const alertMock = vi.fn();
    window.alert = alertMock;

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("Todoの更新"));
    });
    // 1 originally completed (Walk the dog); count must not change
    expect(screen.getByText("1/2 completed")).toBeInTheDocument();
  });

  it("alerts and keeps todo when delete returns 0 rows (silent fail)", async () => {
    const user = userEvent.setup();
    mockTodosUpdateResult.mockResolvedValue({ data: [], error: null });
    const alertMock = vi.fn();
    window.alert = alertMock;

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete task",
    });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("Todoの削除"));
    });
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });

  it("alerts and keeps text when updateText returns 0 rows (silent fail)", async () => {
    const user = userEvent.setup();
    mockTodosUpdateResult.mockResolvedValue({ data: [], error: null });
    const alertMock = vi.fn();
    window.alert = alertMock;

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    // Double-click activates inline edit
    await user.dblClick(screen.getByText("Buy milk"));
    const editInput = screen.getByDisplayValue("Buy milk");
    await user.clear(editInput);
    await user.type(editInput, "Buy bread");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("Todoの更新"));
    });
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.queryByText("Buy bread")).not.toBeInTheDocument();
  });

  it("renders tags in TagFilter when tags exist", async () => {
    mockTagsOrder.mockResolvedValue({ data: mockTags, error: null });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      // Tags appear in both TagFilter and TagSelector, use getAllByText
      expect(screen.getAllByText("Groceries").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("Urgent").length).toBeGreaterThanOrEqual(1);
  });

  it("filters todos by selected tag", async () => {
    const user = userEvent.setup();
    mockTagsOrder.mockResolvedValue({ data: mockTags, error: null });
    mockTodoTagsIn.mockResolvedValue({
      data: [{ todo_id: "todo-1", tag_id: "tag-1" }],
      error: null,
    });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    // Click the first "Groceries" button (in TagFilter, not TagSelector)
    const groceryButtons = screen.getAllByText("Groceries");
    await user.click(groceryButtons[0]);

    await waitFor(() => {
      // Only "Buy milk" has the "Groceries" tag
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
      expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();
    });

    // Click again to deselect — shows all todos again
    const groceryButtonsAfter = screen.getAllByText("Groceries");
    await user.click(groceryButtonsAfter[0]);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });
  });
});
