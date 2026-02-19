import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProfileSetupPage from "./page";

const mockPush = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockUpsert = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

const mockUser = {
  id: "user-1",
  user_metadata: { full_name: "Taro Yamada" },
};

describe("Profile setup page", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockUpsert.mockReset();

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    // Default: no existing profile
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      upsert: mockUpsert,
    });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("shows Google display name as default value for new users", async () => {
    render(<ProfileSetupPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Taro Yamada")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /ニックネーム登録/ })
    ).toBeInTheDocument();
  });

  it("shows existing display name in editing mode", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { display_name: "たろう" },
              error: null,
            }),
        }),
      }),
      upsert: mockUpsert,
    });

    render(<ProfileSetupPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("たろう")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /ニックネーム変更/ })
    ).toBeInTheDocument();
  });

  it("shows validation error when submitting empty name", async () => {
    const user = userEvent.setup();
    render(<ProfileSetupPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Taro Yamada")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("ニックネーム");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText(/ニックネームを入力してください/)).toBeInTheDocument();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("saves profile and redirects to home on success", async () => {
    const user = userEvent.setup();
    render(<ProfileSetupPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Taro Yamada")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(mockUpsert).toHaveBeenCalledWith({
      id: "user-1",
      display_name: "Taro Yamada",
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows error when save fails", async () => {
    mockUpsert.mockResolvedValue({ error: new Error("DB error") });
    const user = userEvent.setup();
    render(<ProfileSetupPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Taro Yamada")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.getByText(/保存に失敗しました/)).toBeInTheDocument();
    });
  });
});
