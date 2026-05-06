import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ListSelector from "./ListSelector";

const mockLists = [
  {
    id: "list-1",
    user_id: "user-1",
    name: "Groceries",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "list-2",
    user_id: "user-1",
    name: "Work",
    created_at: "2026-01-02T00:00:00Z",
  },
];

const mockOrder = vi.fn();
const mockUpdateResult = vi.fn();
const mockDeleteResult = vi.fn();
const mockSingle = vi.fn();
const mockProfilesIn = vi.fn();

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  ensureRealtimeAuth: vi.fn().mockResolvedValue(undefined),
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            in: mockProfilesIn,
          }),
        };
      }
      return {
        select: () => ({
          is: () => ({
            order: mockOrder,
          }),
          order: mockOrder,
        }),
        insert: () => ({
          select: () => ({
            single: mockSingle,
          }),
        }),
        update: () => ({
          eq: () => ({
            select: mockUpdateResult,
          }),
        }),
        delete: () => ({
          eq: () => ({
            select: mockDeleteResult,
          }),
        }),
      };
    },
    channel: () => mockChannel,
    removeChannel: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockOrder.mockResolvedValue({ data: mockLists, error: null });
  mockUpdateResult.mockResolvedValue({ data: [{ id: "list-1" }], error: null });
  mockDeleteResult.mockResolvedValue({ data: [{ id: "list-1" }], error: null });
  mockProfilesIn.mockResolvedValue({ data: [], error: null });
  window.alert = vi.fn();

  // happy-dom doesn't have window.confirm, so define it
  window.confirm = vi.fn(() => true);
});

describe("ListSelector", () => {
  it("renders fetched lists", async () => {
    render(<ListSelector selectedListId={null} onSelectList={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("auto-selects first list when no list is selected", async () => {
    const onSelectList = vi.fn();
    render(<ListSelector selectedListId={null} onSelectList={onSelectList} />);

    await waitFor(() => {
      expect(onSelectList).toHaveBeenCalledWith("list-1");
    });
  });

  it("does not auto-select when a list is already selected", async () => {
    const onSelectList = vi.fn();
    render(<ListSelector selectedListId="list-2" onSelectList={onSelectList} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });
    expect(onSelectList).not.toHaveBeenCalled();
  });

  it("selects a list when clicked", async () => {
    const user = userEvent.setup();
    const onSelectList = vi.fn();
    render(<ListSelector selectedListId="list-1" onSelectList={onSelectList} />);

    await waitFor(() => {
      expect(screen.getByText("Work")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Work"));
    expect(onSelectList).toHaveBeenCalledWith("list-2");
  });

  it("creates a new list", async () => {
    const user = userEvent.setup();
    const onSelectList = vi.fn();
    const newList = {
      id: "list-3",
      user_id: "user-1",
      name: "Shopping",
      created_at: "2026-01-03T00:00:00Z",
    };
    mockSingle.mockResolvedValue({ data: newList, error: null });

    render(<ListSelector selectedListId="list-1" onSelectList={onSelectList} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("New list name...");
    await user.type(input, "Shopping");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText("Shopping")).toBeInTheDocument();
    });
    expect(onSelectList).toHaveBeenCalledWith("list-3");
    expect(input).toHaveValue("");
  });

  it("renames a list", async () => {
    const user = userEvent.setup();
    mockUpdateResult.mockResolvedValue({ data: [{ id: "list-1" }], error: null });

    render(<ListSelector selectedListId="list-1" onSelectList={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Rename Groceries"));

    const editInput = screen.getByDisplayValue("Groceries");
    await user.clear(editInput);
    await user.type(editInput, "Food");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Food")).toBeInTheDocument();
    });
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("deletes a list and selects the next one", async () => {
    const user = userEvent.setup();
    const onSelectList = vi.fn();
    mockUpdateResult.mockResolvedValue({ data: [{ id: "list-1" }], error: null });

    render(<ListSelector selectedListId="list-1" onSelectList={onSelectList} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Delete Groceries"));

    await waitFor(() => {
      expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
    });
    expect(onSelectList).toHaveBeenCalledWith("list-2");
  });

  it("alerts and keeps list when rename returns 0 rows (silent fail)", async () => {
    const user = userEvent.setup();
    mockUpdateResult.mockResolvedValue({ data: [], error: null });
    const alertMock = vi.fn();
    window.alert = alertMock;

    render(<ListSelector selectedListId="list-1" onSelectList={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Rename Groceries"));
    const editInput = screen.getByDisplayValue("Groceries");
    await user.clear(editInput);
    await user.type(editInput, "Food");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("リスト名の変更"));
    });
    // Original name remains because optimistic update was skipped
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.queryByText("Food")).not.toBeInTheDocument();
  });

  it("alerts and keeps list when delete returns 0 rows (silent fail)", async () => {
    const user = userEvent.setup();
    const onSelectList = vi.fn();
    mockUpdateResult.mockResolvedValue({ data: [], error: null });
    const alertMock = vi.fn();
    window.alert = alertMock;

    render(<ListSelector selectedListId="list-1" onSelectList={onSelectList} />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Delete Groceries"));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("リストの削除"));
    });
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("shows owner name on shared lists", async () => {
    const listsWithShared = [
      ...mockLists,
      {
        id: "list-3",
        user_id: "user-2",
        name: "Shared List",
        created_at: "2026-01-03T00:00:00Z",
      },
    ];
    mockOrder.mockResolvedValue({ data: listsWithShared, error: null });
    mockProfilesIn.mockResolvedValue({
      data: [{ id: "user-2", display_name: "Alice" }],
      error: null,
    });

    render(<ListSelector selectedListId="list-1" onSelectList={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("Shared List")).toBeInTheDocument();
    });
    // Owner name shown as tooltip on share icon, not inline
    expect(screen.getByTitle("Shared by Alice")).toBeInTheDocument();
  });

  it("renders empty state with only the new list form", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    render(<ListSelector selectedListId={null} onSelectList={() => {}} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("New list name...")).toBeInTheDocument();
    });

    expect(screen.getByText("Lists")).toBeInTheDocument();
  });
});
