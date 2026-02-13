import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InvitePage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-123" }),
  useRouter: () => ({ push: mockPush }),
}));

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

describe("Invite page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows list name when invite token is valid", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { list_id: "list-1", list_name: "Shopping" },
      error: null,
    });

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText("Shopping")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "参加する" })
      ).toBeInTheDocument();
    });

    expect(mockRpc).toHaveBeenCalledWith("get_invite_info", {
      _token: "test-token-123",
    });
  });

  it("shows error when invite token is invalid", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    });

    render(<InvitePage />);

    await waitFor(() => {
      expect(
        screen.getByText("この招待リンクは無効または期限切れです。")
      ).toBeInTheDocument();
    });
  });

  it("accepts invite and redirects to home on success", async () => {
    // First call: get_invite_info
    mockRpc.mockResolvedValueOnce({
      data: { list_id: "list-1", list_name: "Shopping" },
      error: null,
    });
    // Second call: accept_invite
    mockRpc.mockResolvedValueOnce({ data: "list-1", error: null });

    const user = userEvent.setup();
    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "参加する" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "参加する" }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("accept_invite", {
        _token: "test-token-123",
      });
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows error when accepting own list invite", async () => {
    // First call: get_invite_info
    mockRpc.mockResolvedValueOnce({
      data: { list_id: "list-1", list_name: "Shopping" },
      error: null,
    });
    // Second call: accept_invite
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "You already own this list" },
    });

    const user = userEvent.setup();
    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "参加する" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "参加する" }));

    await waitFor(() => {
      expect(
        screen.getByText("自分のリストには参加できません。")
      ).toBeInTheDocument();
    });
  });
});
