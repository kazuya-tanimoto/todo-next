import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ShareDialog from "./ShareDialog";

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi
  .fn()
  .mockResolvedValue({ data: { user: { id: "user-1" } } });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: mockFrom,
  }),
}));


describe("ShareDialog", () => {
  const defaultProps = {
    listId: "list-1",
    listName: "Shopping",
    isOwner: true,
    onClose: vi.fn(),
    onLeave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [] });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gt: () => ({
              order: () => Promise.resolve({ data: [] }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: "inv-1",
                token: "abc123",
                expires_at: "2026-02-20T00:00:00Z",
                is_active: true,
              },
            }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    });
  });

  it("renders share dialog title and list name for owner", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("共有設定")).toBeInTheDocument();
    expect(screen.getByText("Shopping")).toBeInTheDocument();
  });

  it("shows invite link creation button for owner", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /招待リンクを作成/ })
    ).toBeInTheDocument();
  });

  it("creates invite link and shows copied state", async () => {
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /招待リンクを作成/ })
    );

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("displays member display_name when available", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: "user-2",
          email: "family@example.com",
          display_name: "たろう",
          is_owner: false,
        },
      ],
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("たろう")).toBeInTheDocument();
    });
  });

  it("falls back to email when display_name is null", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: "user-2", email: "family@example.com", display_name: null, is_owner: false },
      ],
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("family@example.com")).toBeInTheDocument();
    });
  });

  it("shows owner badge for owner member", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: "user-1", email: "owner@example.com", display_name: "田中", is_owner: true },
        { user_id: "user-2", email: "member@example.com", display_name: "佐藤", is_owner: false },
      ],
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });
    // Owner badge should appear exactly once
    const badges = screen.getAllByText("オーナー", { exact: true });
    // "オーナー" appears in badge only (dialog title is "共有設定" for owner)
    expect(badges.length).toBe(1);
  });

  it("shows empty member message when no members", async () => {
    render(<ShareDialog {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("まだメンバーがいません")).toBeInTheDocument();
    });
  });

  it("shows member list and leave button for non-owner", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { user_id: "user-owner", email: "owner@example.com", display_name: "オーナーさん", is_owner: true },
        { user_id: "user-1", email: "me@example.com", display_name: "自分", is_owner: false },
      ],
    });

    render(<ShareDialog {...defaultProps} isOwner={false} />);

    await waitFor(() => {
      expect(screen.getByText("オーナーさん")).toBeInTheDocument();
      expect(screen.getByText("自分")).toBeInTheDocument();
    });
    expect(screen.getByText("共有リスト")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /離脱/ })
    ).toBeInTheDocument();
    // Non-owner should not see remove buttons
    expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onLeave and onClose when leaving a shared list", async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} isOwner={false} />);

    // Override mockFrom for delete chain specific to leave
    mockFrom.mockReturnValue({
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    });

    await user.click(
      screen.getByRole("button", { name: /離脱/ })
    );

    await waitFor(() => {
      expect(defaultProps.onLeave).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
