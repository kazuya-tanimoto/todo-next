"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { InviteToken, ListMember } from "@/types";

interface Props {
  listId: string;
  listName: string;
  isOwner: boolean;
  onClose: () => void;
  onLeave?: () => void;
}

export default function ShareDialog({
  listId,
  listName,
  isOwner,
  onClose,
  onLeave,
}: Props) {
  const [members, setMembers] = useState<ListMember[]>([]);
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOwner) {
      fetchMembers();
      fetchInvites();
    }
  }, [listId, isOwner]);

  const fetchMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_list_members", {
      _list_id: listId,
    });
    if (data) setMembers(data);
  };

  const fetchInvites = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("invite_tokens")
      .select("*")
      .eq("list_id", listId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (data) setInvites(data);
  };

  const createInviteLink = async () => {
    setIsCreatingLink(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("invite_tokens")
      .insert({ list_id: listId, created_by: user.id })
      .select()
      .single();

    if (!error && data) {
      setInvites([data, ...invites]);
      copyToClipboard(data.token);
    }
    setIsCreatingLink(false);
  };

  const copyToClipboard = async (token: string) => {
    const url = `${location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const deactivateInvite = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("invite_tokens")
      .update({ is_active: false })
      .eq("id", id);
    setInvites(invites.filter((inv) => inv.id !== id));
  };

  const removeMember = async (userId: string) => {
    if (!window.confirm("このメンバーを削除しますか？")) return;
    const supabase = createClient();
    await supabase
      .from("list_shares")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", userId);
    setMembers(members.filter((m) => m.user_id !== userId));
  };

  const handleLeave = async () => {
    if (!window.confirm("このリストから離脱しますか？")) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("list_shares")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", user.id);

    onLeave?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="theme-card p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            {isOwner ? "共有設定" : "共有リスト"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--fg-secondary)] hover:text-[var(--fg)] text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-[var(--fg-secondary)] mb-4">{listName}</p>

        {isOwner ? (
          <>
            {/* Invite link section */}
            <div className="mb-4">
              <button
                onClick={createInviteLink}
                disabled={isCreatingLink}
                className="theme-btn px-4 py-2 text-sm w-full"
              >
                {isCreatingLink ? "作成中..." : "招待リンクを作成"}
              </button>
            </div>

            {/* Active invites */}
            {invites.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-[var(--fg-secondary)] mb-2">
                  有効な招待リンク
                </p>
                <ul className="space-y-2">
                  {invites.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between text-sm bg-[var(--bg)] p-2 rounded"
                    >
                      <span className="truncate flex-1 text-[var(--fg-secondary)]">
                        {new Date(inv.expires_at).toLocaleDateString()}まで
                      </span>
                      <span className="flex gap-1 ml-2">
                        <button
                          onClick={() => copyToClipboard(inv.token)}
                          className="theme-btn px-2 py-1 text-xs"
                        >
                          {copiedToken === inv.token ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => deactivateInvite(inv.id)}
                          className="px-2 py-1 text-xs text-[var(--fg-secondary)] hover:text-red-500"
                          aria-label="Deactivate invite"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Members */}
            <div>
              <p className="text-sm font-medium text-[var(--fg-secondary)] mb-2">
                メンバー ({members.length})
              </p>
              {members.length === 0 ? (
                <p className="text-sm text-[var(--fg-secondary)]">
                  まだメンバーがいません
                </p>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li
                      key={member.user_id}
                      className="flex items-center justify-between text-sm bg-[var(--bg)] p-2 rounded"
                    >
                      <span className="truncate">
                        {member.display_name ?? member.email}
                      </span>
                      <button
                        onClick={() => removeMember(member.user_id)}
                        className="text-[var(--fg-secondary)] hover:text-red-500 ml-2"
                        aria-label={`Remove ${member.email}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={handleLeave}
            className="theme-btn px-4 py-2 text-sm w-full text-red-500"
          >
            このリストから離脱
          </button>
        )}
      </div>
    </div>
  );
}
