"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [listName, setListName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_invite_info", {
        _token: token,
      });

      if (error || !data) {
        setError("この招待リンクは無効または期限切れです。");
      } else {
        setListName(data.list_name);
      }
      setIsLoading(false);
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("accept_invite", {
      _token: token,
    });

    if (error) {
      if (error.message.includes("already own")) {
        setError("自分のリストには参加できません。");
      } else if (error.message.includes("Invalid or expired")) {
        setError("この招待リンクは無効または期限切れです。");
      } else {
        setError("参加に失敗しました。もう一度お試しください。");
      }
      setIsAccepting(false);
      return;
    }

    // Store the joined list ID so it gets selected on the main page
    if (data) {
      localStorage.setItem("selectedListId", data);
    }
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="theme-card p-8 w-full max-w-sm text-center">
          <p className="text-[var(--fg-secondary)]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="theme-card p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
          リストに招待されました
        </h1>

        {error ? (
          <>
            <p className="text-red-500 mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="theme-btn px-6 py-3 w-full"
            >
              ホームに戻る
            </button>
          </>
        ) : (
          <>
            <p className="text-[var(--fg-secondary)] mb-2">
              以下のリストに参加しますか？
            </p>
            <p className="text-xl font-bold mb-6">{listName}</p>
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="theme-btn px-6 py-3 w-full"
            >
              {isAccepting ? "参加中..." : "参加する"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
