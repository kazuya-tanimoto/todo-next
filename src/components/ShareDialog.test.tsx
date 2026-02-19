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
        { user_id: "user-2", email: "family@example.com", display_name: null },
      ],
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("family@example.com")).toBeInTheDocument();
    });
  });

  it("shows empty member message when no members", async () => {
    render(<ShareDialog {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("まだメンバーがいません")).toBeInTheDocument();
    });
  });

  it("shows leave button for non-owner", () => {
    render(<ShareDialog {...defaultProps} isOwner={false} />);
    expect(screen.getByText("共有リスト")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /離脱/ })
    ).toBeInTheDocument();
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
