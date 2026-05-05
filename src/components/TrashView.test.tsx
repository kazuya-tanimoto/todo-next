import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TrashView from "./TrashView";

const mockGetUser = vi
  .fn()
  .mockResolvedValue({ data: { user: { id: "user-1" } } });

const mockTodosUpdate = vi.fn();
const mockTodosDelete = vi.fn();
const mockListsUpdate = vi.fn();
const mockListsDelete = vi.fn();

let trashTodos: { id: string; text: string; list_id: string; deleted_at: string; lists?: unknown }[] = [];
let trashLists: { id: string; name: string; user_id: string; deleted_at: string }[] = [];

const buildSelectChain = (rows: unknown[]) => {
  // chain: .select(...).eq(...).not(...).order(...) => { data }
  const order = () => Promise.resolve({ data: rows });
  const not = () => ({ order });
  const eq = () => ({ not });
  return { eq };
};

const mockFrom = vi.fn((table: string) => {
  if (table === "todos") {
    return {
      select: () => buildSelectChain(trashTodos),
      update: (...args: unknown[]) => mockTodosUpdate(...args),
      delete: (...args: unknown[]) => mockTodosDelete(...args),
    };
  }
  return {
    select: () => buildSelectChain(trashLists),
    update: (...args: unknown[]) => mockListsUpdate(...args),
    delete: (...args: unknown[]) => mockListsDelete(...args),
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

const makeMutationChain = (response: { data: unknown[] | null; error: unknown }) => ({
  update: () => ({
    eq: () => ({
      select: () => Promise.resolve(response),
    }),
  }),
  delete: () => ({
    eq: () => ({
      select: () => Promise.resolve(response),
    }),
    in: () => ({
      select: () => Promise.resolve(response),
    }),
  }),
});

describe("TrashView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trashTodos = [];
    trashLists = [];
    mockTodosUpdate.mockImplementation(() => makeMutationChain({ data: [{ id: "t1" }], error: null }).update());
    mockTodosDelete.mockImplementation(() => makeMutationChain({ data: [{ id: "t1" }], error: null }).delete());
    mockListsUpdate.mockImplementation(() => makeMutationChain({ data: [{ id: "l1" }], error: null }).update());
    mockListsDelete.mockImplementation(() => makeMutationChain({ data: [{ id: "l1" }], error: null }).delete());
  });

  it("shows empty state when user has no deleted items", async () => {
    render(<TrashView onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Trash is empty")).toBeInTheDocument();
    });
  });

  it("renders deleted lists and orphan todos owned by user", async () => {
    trashLists = [
      {
        id: "l1",
        name: "old-list",
        user_id: "user-1",
        deleted_at: new Date().toISOString(),
      },
    ];
    trashTodos = [
      {
        id: "t1",
        text: "orphan-todo",
        list_id: "l-active",
        deleted_at: new Date().toISOString(),
      },
    ];
    render(<TrashView onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("old-list")).toBeInTheDocument();
      expect(screen.getByText("orphan-todo")).toBeInTheDocument();
    });
  });

  it("alerts and keeps list when restore returns 0 rows (silent fail)", async () => {
    trashLists = [
      {
        id: "l1",
        name: "shared-list",
        user_id: "user-1",
        deleted_at: new Date().toISOString(),
      },
    ];
    mockListsUpdate.mockImplementation(() => makeMutationChain({ data: [], error: null }).update());

    const alertMock = vi.fn();
    window.alert = alertMock;

    const user = userEvent.setup();
    render(<TrashView onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("shared-list"));

    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("リストの復元に失敗")
      );
    });
    // List remains in UI
    expect(screen.getByText("shared-list")).toBeInTheDocument();
  });

  it("removes list from UI when restore succeeds", async () => {
    trashLists = [
      {
        id: "l1",
        name: "own-list",
        user_id: "user-1",
        deleted_at: new Date().toISOString(),
      },
    ];

    const user = userEvent.setup();
    render(<TrashView onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("own-list"));

    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => {
      expect(screen.queryByText("own-list")).not.toBeInTheDocument();
    });
  });

  it("alerts when permanent delete returns 0 rows (silent fail)", async () => {
    trashTodos = [
      {
        id: "t1",
        text: "stuck-todo",
        list_id: "l-active",
        deleted_at: new Date().toISOString(),
      },
    ];
    mockTodosDelete.mockImplementation(() => makeMutationChain({ data: [], error: null }).delete());

    const alertMock = vi.fn();
    window.alert = alertMock;

    const user = userEvent.setup();
    render(<TrashView onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("stuck-todo"));

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Todoの完全削除に失敗")
      );
    });
    expect(screen.getByText("stuck-todo")).toBeInTheDocument();
  });

  it("alerts when emptyTrash partial-fails (silent fail)", async () => {
    trashTodos = [
      {
        id: "t1",
        text: "stuck-todo",
        list_id: "l-active",
        deleted_at: new Date().toISOString(),
      },
    ];
    trashLists = [
      {
        id: "l1",
        name: "stuck-list",
        user_id: "user-1",
        deleted_at: new Date().toISOString(),
      },
    ];
    // todos delete returns 0 rows → 部分失敗
    mockTodosDelete.mockImplementation(
      () => makeMutationChain({ data: [], error: null }).delete()
    );
    mockListsDelete.mockImplementation(
      () => makeMutationChain({ data: [{ id: "l1" }], error: null }).delete()
    );

    window.confirm = vi.fn(() => true);
    const alertMock = vi.fn();
    window.alert = alertMock;

    const user = userEvent.setup();
    render(<TrashView onClose={vi.fn()} />);
    await waitFor(() => screen.getByText("stuck-todo"));

    await user.click(screen.getByRole("button", { name: "Empty trash" }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("ゴミ箱の一部削除")
      );
    });
  });
});
