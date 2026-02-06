import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("Home page", () => {
  it("renders heading and empty state when no todos exist", async () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent("Todo");

    await waitFor(() => {
      expect(
        screen.getByText("Empty list. Time to add tasks!")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("No tasks yet. Add something!")
    ).toBeInTheDocument();
  });

  it("can add a todo via the input form", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("What needs to be done?")
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("What needs to be done?");
    const addButton = screen.getByRole("button", { name: "Add" });

    await user.type(input, "Buy milk");
    await user.click(addButton);

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("0/1 completed")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(
      screen.queryByText("Empty list. Time to add tasks!")
    ).not.toBeInTheDocument();
  });

  it("can toggle and delete a todo", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("What needs to be done?")
      ).toBeInTheDocument();
    });

    // Add a todo first
    const input = screen.getByPlaceholderText("What needs to be done?");
    await user.type(input, "Test todo");
    await user.click(screen.getByRole("button", { name: "Add" }));

    // Toggle it complete
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText("1/1 completed")).toBeInTheDocument();

    // Delete it
    const deleteButton = screen.getByRole("button", { name: "Delete task" });
    await user.click(deleteButton);
    expect(screen.queryByText("Test todo")).not.toBeInTheDocument();
    expect(
      screen.getByText("No tasks yet. Add something!")
    ).toBeInTheDocument();
  });
});
