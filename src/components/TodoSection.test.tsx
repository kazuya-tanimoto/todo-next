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
  },
  {
    id: "todo-2",
    list_id: "list-1",
    text: "Walk the dog",
    completed: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  ensureRealtimeAuth: vi.fn().mockResolvedValue(undefined),
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: mockOrder,
        }),
      }),
      insert: () => ({
        select: () => ({
          single: mockSingle,
        }),
      }),
      update: () => ({
        eq: mockEq,
      }),
      delete: () => ({
        eq: mockEq,
      }),
    }),
    channel: () => mockChannel,
    removeChannel: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockOrder.mockResolvedValue({ data: mockTodos, error: null });
  mockEq.mockResolvedValue({ error: null });
});

describe("TodoSection", () => {
  it("renders empty state when no list is selected", () => {
    render(<TodoSection selectedListId={null} />);

    expect(
      screen.getByText("Select a list to get started")
    ).toBeInTheDocument();
  });

  it("renders empty state when list has no todos", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Empty list. Time to add tasks!")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("No tasks yet. Add something!")
    ).toBeInTheDocument();
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
    };
    mockSingle.mockResolvedValue({ data: newTodo, error: null });

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
    mockEq.mockResolvedValue({ error: null });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Buy milk")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is "Buy milk" (uncompleted)
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText("2/2 completed")).toBeInTheDocument();
    });
  });

  it("can delete a todo", async () => {
    const user = userEvent.setup();
    mockEq.mockResolvedValue({ error: null });

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
    // clearCompleted calls delete().eq("list_id", ...).eq("completed", true)
    // The mock chain: delete() -> eq(mockEq) -> eq needs to return { error: null }
    mockEq.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    render(<TodoSection selectedListId="list-1" />);

    await waitFor(() => {
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Clear completed (1)" })
    );

    await waitFor(() => {
      expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("0/1 completed")).toBeInTheDocument();
  });
});
