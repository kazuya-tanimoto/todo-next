import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockSignOut = vi.fn().mockResolvedValue({});
const mockListsOrder = vi.fn();
const mockTodosOrder = vi.fn();
const mockTodosSingle = vi.fn();
const mockTodosEq = vi.fn();

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/client", () => ({
  ensureRealtimeAuth: vi.fn().mockResolvedValue(undefined),
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => {
      if (table === "lists") {
        return {
          select: () => ({
            order: mockListsOrder,
          }),
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          delete: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      // table === "todos"
      return {
        select: () => ({
          eq: () => ({
            order: mockTodosOrder,
          }),
        }),
        insert: () => ({
          select: () => ({
            single: mockTodosSingle,
          }),
        }),
        update: () => ({
          eq: mockTodosEq,
        }),
        delete: () => ({
          eq: mockTodosEq,
        }),
      };
    },
    channel: () => mockChannel,
    removeChannel: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mockListsOrder.mockResolvedValue({ data: [], error: null });
  mockTodosOrder.mockResolvedValue({ data: [], error: null });
  mockTodosEq.mockResolvedValue({ error: null });
});

describe("Home page", () => {
  it("renders heading, theme switcher, list selector, and todo section", async () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent("Todo");

    // ThemeSwitcher
    expect(screen.getByText("Mono")).toBeInTheDocument();
    expect(screen.getByText("Natural")).toBeInTheDocument();
    expect(screen.getByText("Brutal")).toBeInTheDocument();

    // ListSelector
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("New list name...")
      ).toBeInTheDocument();
    });

    // TodoSection (no list selected → shows prompt)
    expect(
      screen.getByText("Select a list to get started")
    ).toBeInTheDocument();
  });

  it("renders logout button", async () => {
    render(<Home />);

    expect(
      screen.getByRole("button", { name: "ログアウト" })
    ).toBeInTheDocument();
  });

  it("shows todo input when a list is selected", async () => {
    const mockList = {
      id: "list-1",
      user_id: "user-1",
      name: "Groceries",
      created_at: "2026-01-01T00:00:00Z",
    };
    mockListsOrder.mockResolvedValue({ data: [mockList], error: null });
    mockTodosOrder.mockResolvedValue({ data: [], error: null });

    render(<Home />);

    // ListSelector auto-selects the first list, TodoSection loads
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("What needs to be done?")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("No tasks yet. Add something!")
    ).toBeInTheDocument();
  });
});
