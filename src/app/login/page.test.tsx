import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";

const mockSignInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe("Login page", () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
  });

  it("renders login heading and Google login button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Todo"
    );
    expect(
      screen.getByRole("button", { name: /Google/i })
    ).toBeInTheDocument();
  });

  it("calls signInWithOAuth with google provider on button click", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /Google/i }));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("shows error message when login fails", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      error: new Error("OAuth error"),
    });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /Google/i }));

    expect(screen.getByText(/ログインに失敗しました/)).toBeInTheDocument();
  });
});
