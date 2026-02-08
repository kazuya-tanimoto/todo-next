import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockSignOut = vi.fn().mockResolvedValue({});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: () => ({
      select: () => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
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
    }),
  }),
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
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

    // TodoSection
    await waitFor(() => {
      expect(
        screen.getByText("Empty list. Time to add tasks!")
      ).toBeInTheDocument();
    });
  });

  it("renders logout button", async () => {
    render(<Home />);

    expect(
      screen.getByRole("button", { name: "ログアウト" })
    ).toBeInTheDocument();
  });

  it("can add and interact with todos", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("What needs to be done?")
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("What needs to be done?");
    const addButtons = screen.getAllByRole("button", { name: "Add" });
    // TodoSection's Add button (the larger one with px-6)
    const addButton = addButtons.find(
      (btn) => btn.classList.contains("px-6")
    )!;

    await user.type(input, "Buy milk");
    await user.click(addButton);

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("0/1 completed")).toBeInTheDocument();
  });
});
